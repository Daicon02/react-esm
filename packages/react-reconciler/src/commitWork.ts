import {
  Container,
  appendChildToContainer,
  commitUpdate,
  removeChild,
} from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import {
  ChildDeletion,
  MutationMask,
  NoFlags,
  Placement,
  Update,
} from './fiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (finishedWork: FiberNode) => {
  nextEffect = finishedWork

  while (nextEffect !== null) {
    const child: FiberNode | null = nextEffect.child

    if (
      (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
      child !== null
    ) {
      nextEffect = child
    } else {
      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(nextEffect)
        const sibling: FiberNode | null = nextEffect.sibling

        if (sibling !== null) {
          nextEffect = sibling
          break up
        }
        nextEffect = nextEffect.return
      }
    }
  }
}
function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
  const flags = finishedWork.flags
  // flags Placement
  if ((flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }
  // flags Update
  if ((flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }
  // flags ChildDeletion
  if ((flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach((childToDelete: FiberNode) => {
        commitDeletionEffects(childToDelete)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }
}

function commitDeletionEffects(childToDelete: FiberNode) {
  let hostChildFiber: FiberNode | null = null
  function onCommitUnmount(unmountFiber: FiberNode) {
    switch (unmountFiber.tag) {
      case HostComponent:
        if (hostChildFiber === null) {
          hostChildFiber = unmountFiber
        }
        // release ref
        // TODO release ref
        return
      case HostText:
        if (hostChildFiber === null) {
          hostChildFiber = unmountFiber
        }
        return
      case FunctionComponent:
        // TODO useEffect unmount, release ref
        return
      default:
        if (__DEV__) {
          console.warn('unrealized unmount type', unmountFiber)
        }
    }
  }
  // find hostChild
  recursivelyTraverseDeletionEffects(childToDelete, onCommitUnmount)
  // remove hostChild DOM
  if (hostChildFiber !== null) {
    const hostParent = getHostParent(childToDelete)
    const hostChild = (hostChildFiber as FiberNode).stateNode
    if (hostParent !== null) {
      removeChild(hostParent, hostChild)
    }
  }
}

function recursivelyTraverseDeletionEffects(
  root: FiberNode,
  onCommitUnmount: (fiber: FiberNode) => void
) {
  let node = root
  while (node !== null) {
    onCommitUnmount(node)

    if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }
    if (node === root) {
      return
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.warn('execute Placement', finishedWork)
  }
  // find parent instance
  const hostParent = getHostParent(finishedWork)
  // append into DOM tree
  if (hostParent !== null) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent)
  }
}

function getHostParent(fiber: FiberNode): Container | null {
  let parent = fiber.return

  while (parent !== null) {
    const parentTag = parent.tag
    // HostComponent / HostRoot
    if (parentTag === HostComponent) {
      return parent.stateNode
    }
    if (parentTag === HostRoot) {
      return (parent.stateNode as FiberRootNode).container
    }
    parent = parent.return
  }
  if (__DEV__) {
    console.warn('can not find host parent')
  }
  return null
}

function appendPlacementNodeIntoContainer(
  node: FiberNode,
  hostParent: Container
) {
  if (node.tag === HostComponent || node.tag === HostText) {
    const stateNode = node.stateNode
    appendChildToContainer(hostParent, stateNode)
    return
  }
  const child = node.child
  if (child !== null) {
    appendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling

    while (sibling !== null) {
      appendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }
}
