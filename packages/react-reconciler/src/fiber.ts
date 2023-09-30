import { NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'
import { Key, Props, ReactElementType, ReactNode, Ref } from 'shared/ReactTypes'
import {
  Fragment,
  FunctionComponent,
  HostComponent,
  HostText,
  WorkTag,
} from './workTags'
import { Flags } from './fiberFlags'
import { Lane, Lanes, NoLane, NoLanes } from './fiberLane'

export class FiberNode {
  tag: WorkTag
  pendingProps: Props
  key: Key
  ref: Ref
  type: any

  stateNode: any

  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number

  memorizedProps: Props | null
  memorizedState: any

  alternate: FiberNode | null
  flags: Flags
  subtreeFlags: Flags
  deletions: FiberNode[] | null
  updateQueue: unknown

  lanes: Lanes
  childLanes: Lanes

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    this.tag = tag
    this.key = key || null
    this.ref = null
    // eg: Host Component <div> -> div DOM
    this.stateNode = null
    // eg: FunctionComponent -> () => {}
    this.type = null

    // As a Tree
    this.return = null
    this.sibling = null
    this.child = null
    // eg: <ul>li * 3</ul>
    this.index = 0

    // As a WIP Unit
    this.pendingProps = pendingProps
    this.memorizedProps = null
    this.memorizedState = null
    this.updateQueue = null

    this.alternate = null
    // effects
    this.flags = NoFlags
    this.subtreeFlags = NoFlags
    this.deletions = null

    this.lanes = NoLanes
    this.childLanes = NoLanes
  }
}

export class FiberRootNode {
  container: Container
  current: FiberNode
  finishedWork: FiberNode | null
  pendingLanes: Lanes
  finishedLanes: Lanes

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
    this.pendingLanes = NoLanes
    this.finishedLanes = NoLanes
  }
}

export const createWorkInProgress = (
  current: FiberNode,
  pendingProps: Props
): FiberNode => {
  let wip = current.alternate
  if (wip === null) {
    // mount
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.stateNode = current.stateNode

    wip.alternate = current
    current.alternate = wip
  } else {
    // update
    wip.pendingProps = pendingProps
    wip.flags = NoFlags
    wip.subtreeFlags = NoFlags
    wip.deletions = null
  }
  wip.type = current.type
  wip.updateQueue = current.updateQueue
  wip.child = current.child
  wip.memorizedProps = current.memorizedProps
  wip.memorizedState = current.memorizedState

  return wip
}

export const createFiberFromElement = (
  element: ReactElementType
): FiberNode => {
  const { type, key, props } = element
  let fiberTag: WorkTag = FunctionComponent

  if (typeof type === 'string') {
    fiberTag = HostComponent
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('undefined type', element)
  }

  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type

  return fiber
}

export const createFiberFromFragment = (
  elements: ReactNode,
  key: Key
): FiberNode => {
  const fiber = new FiberNode(Fragment, elements, key)
  return fiber
}

export const createFiberFromText = (content: string): FiberNode => {
  const fiber = new FiberNode(HostText, { content }, null)
  return fiber
}
