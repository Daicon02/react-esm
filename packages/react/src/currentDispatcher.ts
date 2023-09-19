import { Action } from 'shared/ReactTypes'

export type Dispatch<State> = (action: Action<State>) => void

export interface Dispatcher {
  useState: <T>(initalState: T | (() => T)) => [T, Dispatch<T>]
}

const currentDispatcher: { current: Dispatcher | null } = {
  current: null,
}

export const resolveDispatcher = (): Dispatcher => {
  const dispatcher = currentDispatcher.current

  if (dispatcher === null) {
    throw new Error('hooks can only run in FC')
  }
  return dispatcher
}

export default currentDispatcher
