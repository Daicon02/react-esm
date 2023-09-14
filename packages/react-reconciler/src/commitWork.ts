import { Container, appendChildToContainer } from 'hostConfig'
import { FiberNode, FiberRootNode } from './fiber'
import { MutationMask, NoFlags, Placement } from './fiberFlags'
import { HostComponent, HostRoot, HostText } from './workTags'

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
  // flags ChildDeletion
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.warn('execute Placement', finishedWork)
  }
  // find parent instance
  const hostParent = getHostParent(finishedWork)
  // append into DOM tree
  appendPlacementNodeIntoContainer(finishedWork, hostParent)
}

function getHostParent(fiber: FiberNode): Container {
  let parent = fiber.return

  while (parent) {
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
}

function appendPlacementNodeIntoContainer(
  node: FiberNode,
  hostParent: Container
) {
  if (node.tag === HostComponent || node.tag === HostText) {
    const stateNode = node.stateNode
    appendChildToContainer(stateNode, hostParent)
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
