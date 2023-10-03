import { scheduleMicrotask } from 'hostConfig'
import { FiberRootNode } from './fiber'
import { NoLane, SyncLane, getHighestPriorityLane } from './fiberLane'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue'
import { performSyncWorkOnRoot } from './workLoop'

// entry of the scheduler
export const ensureRootIsScheduled = (root: FiberRootNode) => {
  const updateLane = getHighestPriorityLane(root.pendingLanes)
  if (updateLane === NoLane) {
    return
  }
  if (updateLane === SyncLane) {
    // micro task schedule
    // synchronous update
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
    scheduleMicrotask(flushSyncCallbacks)
  } else {
    // TODO macro task schedule
    // other priorities
  }
}
