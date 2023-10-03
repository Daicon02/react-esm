import { Action } from 'shared/ReactTypes'
import { Lane, Lanes, includesSomeLane } from './fiberLane'
import { Dispatch } from 'shared/ReactInternalTypes'

export interface Update<State> {
  action: Action<State>
  next: Update<any> | null
  lane: Lane
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(
  action: Action<State>,
  lane: Lane
): Update<State> => {
  return {
    action,
    next: null,
    lane,
  }
}

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
  return {
    shared: {
      pending: null,
    },
    dispatch: null,
  }
}

export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) => {
  // This pointer always point to the end update of updateQueue
  // The updateQueue is a circular queue
  const pending = updateQueue.shared.pending

  if (pending === null) {
    update.next = update
  } else {
    update.next = pending.next
    pending.next = update
  }

  updateQueue.shared.pending = update
}

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLanes: Lanes
): { memorizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memorizedState: baseState,
  }
  if (pendingUpdate !== null) {
    const lastPendingUpdate = pendingUpdate
    const firstPendingUpdate = lastPendingUpdate.next as Update<any>

    let update = firstPendingUpdate

    while (true) {
      const updateLane = update.lane
      if (includesSomeLane(renderLanes, updateLane)) {
        const action = update.action
        baseState = action instanceof Function ? action(baseState) : action
      } else {
        if (__DEV__) {
          console.error('should not fall in this branch of processUpdateQueue')
        }
      }

      update = update.next as Update<any>
      if (update === firstPendingUpdate) {
        break
      }
    }
  }
  result.memorizedState = baseState
  return result
}
