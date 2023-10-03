import { Action } from './ReactTypes'

export type Dispatch<State> = (action: Action<State>) => void

export type EffectCreate = () => (() => void) | void

export type EffectDeps = any[] | null

export interface Dispatcher {
  useState: <T>(initalState: T | (() => T)) => [T, Dispatch<T>]
  useEffect: (create: EffectCreate, deps?: EffectDeps) => void
}
