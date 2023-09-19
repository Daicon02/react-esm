import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'

export interface Update<State> {
  action: Action<State>
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(action: Action<State>): Update<State> => {
  return {
    action,
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
  updateQueue.shared.pending = update
}

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null
): { memorizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memorizedState: baseState,
  }
  if (pendingUpdate !== null) {
    const action = pendingUpdate.action
    result.memorizedState =
      action instanceof Function ? action(baseState) : action

    // if (action instanceof Function) {
    //   // eg: baseState = 1, updateState = (x) => 3 * x -> memorizedState = 3
    //   result.memorizedState = action(baseState)
    // } else {
    //   // eg: baseState = 1, updateState = 2 -> memorizedState = 2
    //   result.memorizedState = action
    // }
  }
  return result
}
