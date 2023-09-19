import {
  Container,
  Instance,
  appendInitialChild,
  createInstance,
  createTextInstance,
} from 'hostConfig'
import { FiberNode } from './fiber'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'
import { NoFlags, Update } from './fiberFlags'

function markUpdate(wip: FiberNode) {
  wip.flags |= Update
}

export const completeWork = (wip: FiberNode) => {
  const newProps = wip.pendingProps
  const current = wip.alternate

  switch (wip.tag) {
    case HostRoot:
      bubbleProperties(wip)
      return null
    case HostComponent:
      if (current !== null && wip.stateNode) {
        // update
      } else {
        // mount
        // 1. build DOM
        const instance = createInstance(wip.type, newProps)
        // 2. append DOM into DOM tree
        appendAllChildren(instance, wip)
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostText:
      if (current !== null && wip.stateNode) {
        // update
        const oldText = current.memorizedProps.content
        const newText = newProps.content
        if (oldText !== newText) {
          markUpdate(wip)
        }
      } else {
        // mount
        // 1. build DOM
        const instance = createTextInstance(newProps.content)
        // 2. append DOM into DOM tree
        wip.stateNode = instance
        bubbleProperties(wip)
      }
      return null
    case FunctionComponent:
      bubbleProperties(wip)
      return null
    default:
      if (__DEV__) {
        console.warn('unrealized type in completeWork')
      }
      return null
  }
}

function appendAllChildren(parent: Instance, wip: FiberNode) {
  let node = wip.child
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node?.stateNode)
    } else if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === wip) {
      return
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === wip) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

// bubble side effects to HostRoot
function bubbleProperties(completedWork: FiberNode) {
  let subtreeFlags = NoFlags
  let child = completedWork.child

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags
    subtreeFlags |= child.flags

    child.return = completedWork
    child = child.sibling
  }
  completedWork.subtreeFlags = subtreeFlags
}
