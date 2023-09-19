import ReactSharedInternals from 'shared/ReactSharedInternals'
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher'
import { FiberNode } from './fiber'
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
  processUpdateQueue,
} from './updateQueue'
import { Action } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'

interface Hook {
  memorizedState: any
  updateQueue: UpdateQueue<any> | null
  next: Hook | null
}

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

const { currentDispatcher } = ReactSharedInternals

export const renderWithHooks = (wip: FiberNode) => {
  // assignment currentlyRenderingFiber
  currentlyRenderingFiber = wip
  wip.memorizedState = null

  const current = wip.alternate
  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  }

  const Component = wip.type
  const props = wip.pendingProps
  // FC render
  const children = Component(props)

  // reset
  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null

  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
}

function updateState<State>(): [State, Dispatch<State>] {
  const hook = updateWorkInProgressHook()

  // calculate new state
  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending

  if (pending !== null) {
    const { memorizedState } = processUpdateQueue(hook.memorizedState, pending)
    hook.memorizedState = memorizedState
  }

  return [hook.memorizedState, queue.dispatch as Dispatch<State>]
}

function updateWorkInProgressHook(): Hook {
  // TODO update when FC rendering
  let nextCurrentHook: Hook | null

  if (currentHook === null) {
    // update && first hook
    const current = currentlyRenderingFiber?.alternate
    if (current !== null) {
      nextCurrentHook = current?.memorizedState
    } else {
      nextCurrentHook = null
    }
  } else {
    // update && next hook
    nextCurrentHook = currentHook.next
  }

  if (nextCurrentHook === null) {
    throw new Error(
      `FC ${currentlyRenderingFiber?.type} rendered more hooks than previous render`
    )
  }

  currentHook = nextCurrentHook
  const newHook: Hook = {
    memorizedState: currentHook.memorizedState,
    updateQueue: currentHook.updateQueue,
    next: null,
  }
  // mount newHook
  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error('Please call hook in FC!')
    }
    workInProgressHook = newHook
    currentlyRenderingFiber.memorizedState = workInProgressHook
  } else {
    workInProgressHook.next = newHook
    workInProgressHook = workInProgressHook.next
  }

  return workInProgressHook
}

function mountState<State>(
  initialState: State | (() => State)
): [State, Dispatch<State>] {
  const hook = mountWorkInProgressHook()
  const memorizedState =
    initialState instanceof Function ? initialState() : initialState
  const queue = createUpdateQueue<State>()
  hook.updateQueue = queue
  hook.memorizedState = memorizedState

  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)
  queue.dispatch = dispatch
  return [memorizedState, dispatch]
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>
) {
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)
  scheduleUpdateOnFiber(fiber)
}

function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memorizedState: null,
    updateQueue: null,
    next: null,
  }
  if (workInProgressHook === null) {
    // mount && first hook
    if (currentlyRenderingFiber === null) {
      // not call hook in FC
      throw new Error('Please call hook in FC!')
    }
    workInProgressHook = hook
    currentlyRenderingFiber.memorizedState = workInProgressHook
  } else {
    // mount && next hook
    workInProgressHook.next = hook
    workInProgressHook = workInProgressHook.next
  }
  return workInProgressHook
}
