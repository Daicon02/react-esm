import {
  continuousYieldMs,
  enableIsInputPending,
  frameYieldMs,
  maxYieldMs,
} from './featureFlags'
import { peek, pop, push } from './minHeap'
import {
  IMMEDIATE_PRIORITY_TIMEOUT,
  ImmediatePriority,
  NORMAL_PRIORITY_TIMEOUT,
  NormalPriority,
  PriorityLevel,
} from './priorities'
import { Callback, Task } from './schedulerTypes'
import {
  getCurrentTime,
  localClearTimeout,
  localSetImmediate,
  localSetTimeout,
} from './supports'

// the Tasks that is actually consumed
const taskQueue: Task[] = []
// the Tasks with delay
const timerQueue: Task[] = []

// Increment id counter
let taskIdCounter: number = 0

// indicate whether the currently scheduled task is a delayed task
let isHostTimeoutScheduled: boolean = false
let isHostCallbackScheduled: boolean = false

// While performing work, to prevent re-entrance
let isPerformingWork: boolean = false

let currentTask: Task | null = null
let currentPriorityLevel: PriorityLevel = NormalPriority

// scheduler entrance
export const scheduleCallback = (
  priorityLevel: PriorityLevel,
  callback: Callback,
  options?: { delay: number }
): Task => {
  const currentTime = getCurrentTime()

  const delay = options !== undefined && options.delay > 0 ? options.delay : 0

  const startTime = currentTime + delay

  let timeout: number
  switch (priorityLevel) {
    // TODO: Add more priorities
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT
      break
    case NormalPriority:
    default:
      if (__DEV__) {
        console.warn('unrealized priorityLevel', priorityLevel)
      }
      timeout = NORMAL_PRIORITY_TIMEOUT
      break
  }

  const expirationTime = startTime + timeout

  const newTask: Task = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  }

  if (delay > 0) {
    // This is a delayed task
    // process timerQueue
    newTask.sortIndex = startTime
    push(timerQueue, newTask)
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      if (isHostTimeoutScheduled) {
        cancelHostTimeout()
      } else {
        isHostTimeoutScheduled = true
      }
      requestHostTimeout(handleTimeout, delay)
    }
  } else {
    // schedule a hostCallback
    // process taskQueue
    newTask.sortIndex = expirationTime
    push(taskQueue, newTask)
    if (!isHostCallbackScheduled && !isPerformingWork) {
      requestHostCallback()
    }
  }

  return newTask
}

let isMessageLoopRunning: boolean = false
// TODO: Support more runtimes other than Browser and Nodejs
let taskTimeoutID: number | NodeJS.Timeout = -1

let startTime = -1

let frameInterval = frameYieldMs
// let continuousInputInterval = continuousYieldMs
// const maxInteval = maxYieldMs

// let needsPaint = false

function forceFrameRate(fps: number) {
  if (fps < 0 || fps > 125) {
    if (__DEV__) {
      console.error(
        'forceFrameRate takes a positive int between 0 and 125, ' +
          'forcing frame rates higher than 125 fps is not supported'
      )
    }
    return
  }
  if (fps > 0) {
    frameInterval = Math.floor(1000 / fps)
  } else {
    // reset the Framerate
    frameInterval = frameYieldMs
  }
}

function shouldYieldHost(): boolean {
  const timeElapsed = getCurrentTime() - startTime
  if (timeElapsed < frameInterval) {
    return false
  }

  return true
}

function workLoop(initialTime: number): boolean {
  let currentTime = initialTime
  advanceTimers(currentTime)
  currentTask = peek(taskQueue)

  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && shouldYieldHost()) {
      break
    }
    const callback = currentTask.callback
    if (typeof callback === 'function') {
      currentTask.callback = null
      currentPriorityLevel = currentTask.priorityLevel
      // callback might accept a parameter
      // If it does, invoke with parameter
      // otherwise,  invoke immediately
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime
      const continuationCallback = callback(didUserCallbackTimeout)
      currentTime = getCurrentTime()
      if (typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback
      }
      advanceTimers(currentTime)
      return true
    } else {
      if (currentTask === peek(taskQueue)) {
        pop(taskQueue)
      }
      currentTask = peek(taskQueue)
    }
  }

  // Exit the while loop, the current workLoop is complete
  if (currentTask !== null) {
    // New tasks have arrived
    return true
  } else {
    // request timerQueue
    const firstTimerTask = peek(timerQueue)
    if (firstTimerTask !== null) {
      requestHostTimeout(handleTimeout, firstTimerTask.startTime - currentTime)
    }
    return false
  }
}

function flushWork(initialTime: number): boolean {
  isHostCallbackScheduled = false

  if (isHostTimeoutScheduled) {
    isHostTimeoutScheduled = false
    cancelHostTimeout()
  }

  isPerformingWork = true
  const previousPriorityLevel = currentPriorityLevel
  try {
    return workLoop(initialTime)
  } catch (error) {
    if (__DEV__) {
      console.error('someting wrong in workLoop', error)
    }
    throw error
  } finally {
    currentTask = null
    currentPriorityLevel = previousPriorityLevel
    isPerformingWork = false
  }
}

const performWorkUnitDeadline = () => {
  if (isMessageLoopRunning) {
    const currentTime = getCurrentTime()

    startTime = currentTime
    let hasMoreWork = true
    try {
      hasMoreWork = flushWork(currentTime)
    } catch (error) {
      if (__DEV__) {
        console.error('something wrong when flushWork', error)
        throw error
      }
    } finally {
      if (hasMoreWork) {
        schedulePerformWorkUnitDeadline()
      } else {
        isMessageLoopRunning = false
      }
    }
  }
}

let schedulePerformWorkUnitDeadline: () => void
// priority: setImmediate > MessageChannel > setTimeout)
if (localSetImmediate !== null) {
  schedulePerformWorkUnitDeadline = () => {
    if (typeof localSetImmediate === 'function') {
      localSetImmediate(performWorkUnitDeadline)
    }
  }
} else if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel()
  const port = channel.port2
  channel.port1.onmessage = performWorkUnitDeadline
  schedulePerformWorkUnitDeadline = () => {
    port.postMessage(null)
  }
} else {
  if (localSetTimeout !== null) {
    schedulePerformWorkUnitDeadline = () => {
      if (typeof localSetTimeout === 'function') {
        localSetTimeout(performWorkUnitDeadline, 0)
      }
    }
  }
}

function requestHostCallback() {
  if (!isHostCallbackScheduled) {
    isMessageLoopRunning = true
    schedulePerformWorkUnitDeadline()
  }
}

function advanceTimers(currentTime: number) {
  let timerTask = peek(timerQueue)
  while (timerTask !== null) {
    if (timerTask.callback === null) {
      // timerTask was canceled
      pop(timerQueue)
    } else if (timerTask.startTime <= currentTime) {
      // timerTask fired, push into taskQueue
      pop(timerQueue)
      timerTask.sortIndex = timerTask.expirationTime
      push(taskQueue, timerTask)
    } else {
      // remaining pending
      return
    }
    timerTask = peek(timerQueue)
  }
}

function handleTimeout(currentTime: number) {
  isHostTimeoutScheduled = false
  advanceTimers(currentTime)

  if (!isHostCallbackScheduled) {
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true
      requestHostCallback()
    } else {
      const firstTimerTask = peek(timerQueue)
      if (firstTimerTask !== null) {
        requestHostTimeout(
          handleTimeout,
          firstTimerTask.startTime - currentTime
        )
      }
    }
  }
}

function requestHostTimeout(
  callback: (currentTime: number) => void,
  ms: number
) {
  if (localSetTimeout !== null) {
    taskTimeoutID = localSetTimeout(() => {
      callback(getCurrentTime())
    }, ms)
  }
}

function cancelHostTimeout() {
  if (localClearTimeout !== null) {
    localClearTimeout(taskTimeoutID)
    taskTimeoutID = -1
  }
}
