import {
  Container,
  Instance,
  appendChild,
  commitUpdate,
  insertBefore,
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
  // This hostParent is used in commitDeletionEffects to mark the firstHostChild
  // which means dom API removeChild() is called once
  let hostParent = getHostParent(childToDelete)
  commitDeletionEffectsOnFiber(childToDelete)

  function commitDeletionEffectsOnFiber(childToDelete: FiberNode) {
    switch (childToDelete.tag) {
      case HostComponent:
      // TODO release ref
      // Intentional fallthrough to next branch
      case HostText:
        const prevHostParent = hostParent
        hostParent = null
        recursivelyTraverseDeletionEffects(childToDelete)
        hostParent = prevHostParent
        if (hostParent !== null) {
          console.log('remove')

          removeChild(hostParent, childToDelete.stateNode)
        }
        return
      case FunctionComponent:
        // TODO useEffect unmount, release ref
        return
      default:
        if (__DEV__) {
          console.warn('unrealized unmount type', childToDelete)
        }
    }
  }

  function recursivelyTraverseDeletionEffects(parent: FiberNode) {
    console.log('recursivelyTraverse')

    let child = parent.child
    while (child !== null) {
      commitDeletionEffectsOnFiber(child)
      child = child.sibling
    }
  }
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.warn('execute Placement', finishedWork)
  }
  // find parent instance
  const hostParent = getHostParent(finishedWork)
  // find sibling instace
  const hostSibling = getHostSibling(finishedWork)
  // append into DOM tree
  if (hostParent !== null) {
    insertOrAppendPlacementNode(finishedWork, hostParent, hostSibling)
  }
}

function getHostSibling(fiber: FiberNode): Instance | null {
  let node: FiberNode = fiber
  findHostSibling: while (true) {
    while (node.sibling === null) {
      const parent = node.return
      if (parent === null || isHostParent(parent)) {
        return null
      }
      node = parent
    }
    node.sibling.return = node.return
    node = node.sibling
    while (!isHostFiber(node)) {
      if ((node.flags & Placement) !== NoFlags) {
        continue findHostSibling
      }
      if (node.child === null) {
        continue findHostSibling
      }
      node.child.return = node
      node = node.child
    }
    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode
    }
  }
}

function isHostFiber(fiber: FiberNode): boolean {
  return fiber.tag === HostComponent || fiber.tag === HostText
}

function isHostParent(parent: FiberNode): boolean {
  return parent.tag === HostComponent || parent.tag === HostRoot
}

function getHostParent(fiber: FiberNode): Container | Element | null {
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

function insertOrAppendPlacementNode(
  node: FiberNode,
  hostParent: Container,
  before: Instance | null
) {
  const isHost = isHostFiber(node)
  if (isHost) {
    const stateNode = node.stateNode
    if (before !== null) {
      insertBefore(hostParent, stateNode, before)
    } else {
      appendChild(hostParent, stateNode)
    }
    return
  }
  const child = node.child
  if (child !== null) {
    insertOrAppendPlacementNode(child, hostParent, before)
    let sibling = child.sibling

    while (sibling !== null) {
      insertOrAppendPlacementNode(sibling, hostParent, before)
      sibling = sibling.sibling
    }
  }
}
