import { PriorityLevel } from './priorities'

export type Callback = (didTimeout?: boolean) => Callback | void

export interface Task {
  id: number
  callback: Callback | null
  priorityLevel: PriorityLevel
  startTime: number
  expirationTime: number
  sortIndex: number
  isQueued?: boolean
}
