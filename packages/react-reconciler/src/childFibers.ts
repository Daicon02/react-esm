import { Props, ReactElementType } from 'shared/ReactTypes'
import {
  FiberNode,
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress,
} from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { ChildDeletion, Placement } from './fiberFlags'
import { HostText } from './workTags'
import { isArray } from 'shared/utils'

type ExistingChildren = Map<string | number, FiberNode>

function createChildReconciler(shouldTrackSideEffects: boolean) {
  function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps)
    clone.index = 0
    clone.sibling = null
    return clone
  }

  function deleteRemainingChildren(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null
  ) {
    if (!shouldTrackSideEffects) {
      return
    }
    let childToDelete = currentFirstChild
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }

  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackSideEffects) {
      return
    }
    const deletions = returnFiber.deletions
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      deletions.push(childToDelete)
    }
  }

  // Establishing parent-child Fiber relationships when mount
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    element: ReactElementType
  ): FiberNode {
    const key = element.key
    let child = currentFirstChild
    // update
    while (child !== null) {
      if (child.key === key) {
        const elementType = element.type
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (child.type === elementType) {
            // reuse fiber
            const existing = useFiber(child, element.props)
            existing.return = returnFiber
            // flag deletion remaining children
            deleteRemainingChildren(returnFiber, child.sibling)
            return existing
          }
          // key === key, type !== type
          deleteRemainingChildren(returnFiber, child)
          break
        } else {
          if (__DEV__) {
            console.warn('unrealized react type', element)
            break
          }
        }
      } else {
        // delete old child
        deleteChild(returnFiber, child)
      }
      child = child.sibling
    }

    // mount
    // create fiberNode from element
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    content: string
  ): FiberNode {
    let child = currentFirstChild
    // update
    while (child !== null) {
      if (child.tag === HostText) {
        const existing = useFiber(child, { content })
        existing.return = returnFiber
        // delete remaining children
        deleteRemainingChildren(returnFiber, child.sibling)
        return existing
      }
      deleteChild(returnFiber, child)
      child = child.sibling
    }

    // mount
    // create fiberNode from Text
    const fiber = createFiberFromText(content)
    fiber.return = returnFiber
    return fiber
  }

  function placeSingleChild(fiber: FiberNode): FiberNode {
    if (shouldTrackSideEffects && fiber.alternate === null) {
      fiber.flags |= Placement
    }
    return fiber
  }

  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChildren: any[]
  ): FiberNode | null {
    let previousNewFiber: FiberNode | null = null
    let resultingFirstChild: FiberNode | null = null
    // the index of last reused Fiber in current Tree && non-decreasing
    let lastPlacedIndex: number = 0

    // 1. set current children into map
    const existingChildren: ExistingChildren = new Map()
    let current = currentFirstChild
    while (current !== null) {
      const keyToUse = current.key ? current.key : current.index
      existingChildren.set(keyToUse, current)
      current = current.sibling
    }
    // 2. travel newChild in the map, check key && type
    for (const [newIndex, newChild] of newChildren.entries()) {
      const newFiber = updateFromMap(
        returnFiber,
        existingChildren,
        newIndex,
        newChild
      )
      if (newFiber === null || !shouldTrackSideEffects) {
        continue
      }
      // delete reused fibers in the map
      if (newFiber.alternate === null) {
        const keyToUse = newFiber.key ? newFiber.key : newIndex
        existingChildren.delete(keyToUse)
      }

      // 3. mark Placement
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex)
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber
      } else {
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
    }
    // 4. delete remaining children in the map
    if (shouldTrackSideEffects) {
      existingChildren.forEach((child: FiberNode) =>
        deleteChild(returnFiber, child)
      )
    }

    return resultingFirstChild
  }

  function placeChild(
    newFiber: FiberNode,
    lastPlacedIndex: number,
    newIndex: number
  ): number {
    newFiber.index = newIndex
    const current = newFiber.alternate
    if (current !== null) {
      const oldIndex = current.index
      if (oldIndex < lastPlacedIndex) {
        newFiber.flags |= Placement
        return lastPlacedIndex
      } else {
        return oldIndex
      }
    }
    newFiber.flags |= Placement
    return lastPlacedIndex
  }

  function updateFromMap(
    returnFiber: FiberNode,
    existingChildren: ExistingChildren,
    newIndex: number,
    newChild: any
  ): FiberNode | null {
    const keyToUse = newChild.key ? newChild.key : newIndex
    const matchedFiber = existingChildren.get(keyToUse) as FiberNode
    // HostText
    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      return updateTextNode(returnFiber, matchedFiber, '' + newChild)
    }

    // ReactElement
    if (typeof newChild === 'object' && newChild !== null) {
      const element = newChild as ReactElementType
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return updateElement(returnFiber, matchedFiber, element)

        default:
          if (__DEV__) {
            console.warn(
              'unrealized react type in reconcileChildrenArray',
              newChild
            )
            return null
          }
      }
    }

    // TODO Array types && Fragment
    if (isArray(newChild) && __DEV__) {
      console.warn('unrealized array type child')
      return null
    }
    return null
  }

  function updateElement(
    returnFiber: FiberNode,
    matchedFiber: FiberNode,
    element: ReactElementType
  ): FiberNode {
    const elementType = element.type
    if (matchedFiber !== null) {
      if (matchedFiber.type === elementType) {
        const existing = useFiber(matchedFiber, element.props)
        existing.return = returnFiber
        return existing
      }
    }
    const created = createFiberFromElement(element)
    created.return = returnFiber
    return created
  }

  function updateTextNode(
    returnFiber: FiberNode,
    matchedFiber: FiberNode | null,
    textContent: string
  ): FiberNode {
    if (matchedFiber !== null && matchedFiber.tag === HostText) {
      const existing = useFiber(matchedFiber, { content: textContent })
      existing.return = returnFiber
      return existing
    } else {
      const created = createFiberFromText(textContent)
      created.return = returnFiber
      return created
    }
  }

  function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild?: any
  ) {
    // type checking
    // ReactElement
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(returnFiber, currentFirstChild, newChild)
          )

        default:
          if (__DEV__) {
            console.warn('unrealized reconcile types', newChild)
          }
          break
      }
      // multi node -> <ul>li * 3</ul>
      if (isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFirstChild, newChild)
      }
    }

    // HostText
    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFirstChild, '' + newChild)
      )
    }
    if (currentFirstChild !== null) {
      deleteChild(returnFiber, currentFirstChild)
    }

    if (__DEV__) {
      console.warn('unrealized reconcile types', newChild)
    }
    return null
  }

  return reconcileChildFibers
}

export const reconcileChildFibers = createChildReconciler(true)
export const mountChildFibers = createChildReconciler(false)
