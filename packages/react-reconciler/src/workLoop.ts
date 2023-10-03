import { beginWork } from './beginWork'
import {
  commitHookEffectListDestroy,
  commitHookEffectListMount,
  commitHookEffectListUnmount,
  commitMutationEffects,
} from './commitWork'
import { completeWork } from './completeWork'
import {
  FiberNode,
  FiberRootNode,
  PendingPassiveEffects,
  createWorkInProgress,
} from './fiber'
import { ensureRootIsScheduled } from './rootScheduler'
import { HostRoot } from './workTags'
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags'
import {
  Lane,
  Lanes,
  NoLanes,
  getHighestPriorityLane,
  includesSyncLane,
  markRootFinished,
} from './fiberLane'
import { NormalPriority, scheduleCallback } from './Scheduler'
import { Effect } from './fiberHooks'
import { HookHasEffect, HookPassive } from './hookEffectTags'
import { flushSyncCallbacks } from './syncTaskQueue'

let workInProgress: FiberNode | null
let wipRootRenderLanes: Lanes = NoLanes
let renderLanes: Lanes = NoLanes

let rootDoesHavePassiveEffect: boolean = false

const RootInProgress = 0
const RootInComplete = 1
const RootCompleted = 2
const RootDidNotComplete = 3

type RootExistStatus = number
// let wipRootExistStatus: RootExistStatus = RootInProgress

function prepareFreshStack(root: FiberRootNode, lanes: Lanes) {
  root.finishedLanes = NoLanes
  root.finishedWork = null
  workInProgress = createWorkInProgress(root.current, {})
  wipRootRenderLanes = renderLanes = lanes
}

export const scheduleUpdateOnFiber = (fiber: FiberNode, lane: Lane) => {
  // TODO schedule
  // get fiberRootNode
  const root = markUpdateFromFiberToRoot(fiber)
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

function markRootUpdated(root: FiberRootNode, updateLane: Lane) {
  root.pendingLanes |= updateLane
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber
  let parent = node.return
  while (parent !== null) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}

export function performSyncWorkOnRoot(root: FiberRootNode) {
  const lanes = getHighestPriorityLane(root.pendingLanes)

  if (!includesSyncLane(lanes)) {
    ensureRootIsScheduled(root)
    return
  }

  const existStatus = renderRootSync(root, lanes)

  if (lanes === NoLanes && __DEV__) {
    console.error('lanes should not to be NoLanes after renderRootSync')
  }

  // commit stage
  switch (existStatus) {
    case RootCompleted:
      const finishedWork = root.current.alternate
      root.finishedWork = finishedWork
      root.finishedLanes = lanes
      wipRootRenderLanes = NoLanes
      commitRoot(root)
      break
    default:
      if (__DEV__) {
        console.warn(
          'unrealized existStatus in performSyncWorkOnRoot',
          existStatus
        )
      }
  }

  rootDoesHavePassiveEffect = false
  ensureRootIsScheduled
}

function renderRootSync(root: FiberRootNode, lanes: Lanes): Lane {
  if (__DEV__) {
    console.warn('render start', root)
  }
  // init
  if (wipRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes)
  }
  // render stage
  while (true) {
    try {
      workLoopSync()
      break
    } catch (e) {
      if (__DEV__) {
        console.warn('workLoop error', e)
      }
      workInProgress = null
    }
  }

  // if (wipRootExistStatus !== RootInProgress) {
  //   return wipRootExistStatus
  // }

  return RootCompleted
}

function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(unitOfWork: FiberNode) {
  const next = beginWork(unitOfWork, renderLanes)

  unitOfWork.memorizedProps = unitOfWork.pendingProps

  if (next === null) {
    completeUnitOfWork(unitOfWork)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(unitOfWork: FiberNode) {
  let completedWork: FiberNode | null = unitOfWork

  while (completedWork !== null) {
    completeWork(completedWork)
    const sibling = completedWork.sibling

    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    completedWork = completedWork.return
    workInProgress = completedWork
  }
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork
  const lanes = root.finishedLanes

  if (finishedWork === null) {
    return
  }

  if (__DEV__) {
    console.warn('commit start', finishedWork)
  }

  // reset
  root.finishedWork = null
  root.finishedLanes = NoLanes

  markRootFinished(root, lanes)

  if (
    (finishedWork.flags & PassiveMask) !== NoFlags ||
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true
      // schedule effects
      scheduleCallback(NormalPriority, () => {
        // process effects
        flushPassiveEffects(root.pendingPassiveEffects)
        return
      })
    }
  }

  // check 3 substages exist
  const subtreeHasEffect =
    (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags

  if (subtreeHasEffect || rootHasEffect) {
    // beforeMutation
    // mutation
    commitMutationEffects(root, finishedWork)

    root.current = finishedWork

    // layout
  } else {
    root.current = finishedWork
  }
  if (rootDoesHavePassiveEffect) {
    rootDoesHavePassiveEffect = false
  }

  ensureRootIsScheduled(root)
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
  pendingPassiveEffects.unmount.forEach((effect: Effect) => {
    commitHookEffectListUnmount(HookPassive, effect)
  })
  pendingPassiveEffects.unmount = []

  pendingPassiveEffects.update.forEach((effect: Effect) => {
    commitHookEffectListDestroy(HookPassive | HookHasEffect, effect)
  })
  pendingPassiveEffects.update.forEach((effect: Effect) => {
    commitHookEffectListMount(HookPassive | HookHasEffect, effect)
  })
  pendingPassiveEffects.update = []

  flushSyncCallbacks()
}
