import { FiberRootNode } from './fiber'

export type Lane = number

export type Lanes = number

export const NoLane = /*   */ 0b0000

export const NoLanes = /*  */ 0b0000

export const SyncLane = /* */ 0b0001

export const includesSomeLane = (a: Lanes | Lane, b: Lanes | Lane): boolean => {
  return (a & b) !== NoLanes
}

export const mergeLanes = (a: Lanes | Lane, b: Lanes | Lane): Lane => {
  return a | b
}

export const removeLane = (set: Lanes, subSet: Lanes | Lane): Lanes => {
  return set & ~subSet
}

export const requestUpdateLane = (): Lane => {
  return SyncLane
}

export const getHighestPriorityLane = (lanes: Lanes): Lane => {
  return lanes & -lanes
}

export const includesSyncLane = (lanes: Lanes): boolean => {
  return (lanes & SyncLane) !== NoLane
}

export const markRootFinished = (
  root: FiberRootNode,
  noLongerPendingLanes: Lanes
) => {
  root.pendingLanes &= ~noLongerPendingLanes
}
