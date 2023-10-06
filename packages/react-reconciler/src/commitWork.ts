import {
  Container,
  Instance,
  appendChild,
  appendChildToContainer,
  commitUpdate,
  insertBefore,
  insertInContainerBefore,
  removeChild,
} from 'hostConfig'
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber'
import {
  ChildDeletion,
  Flags,
  MutationMask,
  NoFlags,
  Passive as PassiveEffect,
  PassiveMask,
  Placement,
  Update,
} from './fiberFlags'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'
import { Effect, FCUpdateQueue } from './fiberHooks'
import { HookHasEffect } from './hookEffectTags'

let nextEffect: FiberNode | null = null

export const commitMutationEffects = (
  root: FiberRootNode,
  finishedWork: FiberNode
) => {
  nextEffect = finishedWork

  while (nextEffect !== null) {
    const child: FiberNode | null = nextEffect.child

    if (
      (nextEffect.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags &&
      child !== null
    ) {
      nextEffect = child
    } else {
      up: while (nextEffect !== null) {
        commitMutationEffectsOnFiber(root, nextEffect)
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
function commitMutationEffectsOnFiber(
  root: FiberRootNode,
  finishedWork: FiberNode
) {
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
        commitDeletionEffects(root, childToDelete)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }
  if ((flags & PassiveEffect) !== NoFlags) {
    // collect passive effects
    commitPassiveEffectList(root, finishedWork, 'update')
    finishedWork.flags &= ~PassiveEffect
  }
}

function commitPassiveEffectList(
  root: FiberRootNode,
  fiber: FiberNode,
  type: keyof PendingPassiveEffects
) {
  if (
    fiber.tag !== FunctionComponent ||
    (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)
  ) {
    return
  }
  const updateQueue = fiber.updateQueue as FCUpdateQueue<any>
  if (updateQueue.lastEffect === null && __DEV__) {
    console.error('When FC has PassiveEffect flag, effect should be existed')
  }
  root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect)
}

function commitHookEffectList(
  flags: Flags,
  lastEffect: Effect,
  callback: (effect: Effect) => void
) {
  const firstEffect = lastEffect.next
  let effect = lastEffect.next as Effect

  while (true) {
    if ((effect.tag & flags) === flags) {
      callback(effect)
    }
    effect = effect.next as Effect
    if (effect === firstEffect) {
      break
    }
  }
}

export const commitHookEffectListMount = (flags: Flags, lastEffect: Effect) => {
  const mountCallback = (effect: Effect) => {
    const create = effect.create
    if (typeof create === 'function') {
      effect.inst.destroy = create()
    }
    effect.tag &= ~HookHasEffect
  }
  commitHookEffectList(flags, lastEffect, mountCallback)
}

export const commitHookEffectListUnmount = (
  flags: Flags,
  lastEffect: Effect
) => {
  const unmountCallback = (effect: Effect) => {
    const destroy = effect.inst.destroy
    if (typeof destroy === 'function') {
      destroy()
    }
    effect.tag &= ~HookHasEffect
  }
  commitHookEffectList(flags, lastEffect, unmountCallback)
}

export const commitHookEffectListDestroy = (
  flags: Flags,
  lastEffect: Effect
) => {
  const destroyCallback = (effect: Effect) => {
    const destroy = effect.inst.destroy
    if (typeof destroy === 'function') {
      destroy()
    }
  }
  commitHookEffectList(flags, lastEffect, destroyCallback)
}

function commitDeletionEffects(root: FiberRootNode, childToDelete: FiberNode) {
  // This hostParent is used in commitDeletionEffects to mark the firstHostChild
  // which means dom API removeChild is called once
  let hostParent = getHostParent(childToDelete)
  commitDeletionEffectsOnFiber(root, childToDelete)

  function commitDeletionEffectsOnFiber(
    root: FiberRootNode,
    childToDelete: FiberNode
  ) {
    switch (childToDelete.tag) {
      case HostComponent:
      // TODO: release ref
      // Intentional fallthrough to next branch
      case HostText:
        const prevHostParent = hostParent
        hostParent = null
        recursivelyTraverseDeletionEffects(root, childToDelete)
        hostParent = prevHostParent
        if (hostParent !== null) {
          removeChild(hostParent, childToDelete.stateNode)
        }
        return
      case FunctionComponent:
        // TODO: release ref
        commitPassiveEffectList(root, childToDelete, 'unmount')
        recursivelyTraverseDeletionEffects(root, childToDelete)
        return
      default:
        if (__DEV__) {
          console.warn('unrealized unmount type', childToDelete)
        }
    }
  }

  function recursivelyTraverseDeletionEffects(
    root: FiberRootNode,
    parent: FiberNode
  ) {
    let child = parent.child
    while (child !== null) {
      commitDeletionEffectsOnFiber(root, child)
      child = child.sibling
    }
  }
}

function commitPlacement(finishedWork: FiberNode) {
  if (__DEV__) {
    console.warn('execute Placement', finishedWork)
  }

  // find parent fiber
  const hostParentFiber = getHostParentFiber(finishedWork)
  // find sibling instace
  const hostSibling = getHostSibling(finishedWork)
  // append into DOM tree
  switch (hostParentFiber.tag) {
    case HostRoot:
      const container = (hostParentFiber.stateNode as FiberRootNode).container
      insertOrAppendPlacementNodeIntoContainer(
        finishedWork,
        container,
        hostSibling
      )
      break
    case HostComponent:
      const hostParent = hostParentFiber.stateNode
      insertOrAppendPlacementNode(finishedWork, hostParent, hostSibling)
      break
    default:
      if (__DEV__) {
        console.warn('unrealized type in commitPlacement', finishedWork)
      }
      break
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

function getHostParentFiber(fiber: FiberNode): FiberNode {
  let parent = fiber.return
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent
    }
    parent = parent.return
  }
  throw new Error(
    'Expected to find a host parent. This error is likely caused by a bug '
  )
}

function getHostParent(fiber: FiberNode): Container | Instance | null {
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

function insertOrAppendPlacementNodeIntoContainer(
  node: FiberNode,
  hostParent: Container,
  before: Instance | null
) {
  const isHost = isHostFiber(node)
  if (isHost) {
    const stateNode = node.stateNode
    if (before !== null) {
      insertInContainerBefore(hostParent, stateNode, before)
    } else {
      appendChildToContainer(hostParent, stateNode)
    }
    return
  }
  const child = node.child
  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent, before)
    let sibling = child.sibling
    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent, before)
      sibling = sibling.sibling
    }
  }
}

function insertOrAppendPlacementNode(
  node: FiberNode,
  hostParent: Instance,
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
