import { NoFlags } from './fiberFlags'
import type { Key, Props, Ref } from 'shared/ReactTypes'
import type { WorkTag } from './workTags'
import type { Flags } from './fiberFlags'

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

  alternate: FiberNode | null
  flags: Flags

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    this.tag = tag
    this.key = key
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

    this.alternate = null

    // effects
    this.flags = NoFlags
  }
}
