import { Key, Props, ReactElementType, ReactNode } from 'shared/ReactTypes'
import {
  FiberNode,
  createFiberFromElement,
  createFiberFromFragment,
  createFiberFromText,
  createWorkInProgress,
} from './fiber'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols'
import { ChildDeletion, Placement } from './fiberFlags'
import { Fragment, HostText } from './workTags'
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
            let props = element.props
            if (element.type === REACT_FRAGMENT_TYPE) {
              props = element.props.children
            }
            // reuse fiber
            const existing = useFiber(child, props)
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
    let created: FiberNode
    if (element.type === REACT_FRAGMENT_TYPE) {
      created = createFiberFromFragment(element.props.children, key)
    } else {
      created = createFiberFromElement(element)
    }
    created.return = returnFiber
    return created
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
      if (newFiber === null) {
        continue
      }
      // delete reused fibers in the map
      if (newFiber.alternate !== null && shouldTrackSideEffects) {
        const keyToUse = newFiber.key ? newFiber.key : newIndex
        existingChildren.delete(keyToUse)
      }

      // 3. mark Placement (insertion || move)
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex)
      // establish sibling between child Fibers in children
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
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex
    }
    if (current !== null) {
      // update
      const oldIndex = current.index
      if (oldIndex < lastPlacedIndex) {
        // This is a move
        newFiber.flags |= Placement
        return lastPlacedIndex
      } else {
        return oldIndex
      }
    }
    // mount: This is an Insertion
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
    const matchedFiber = existingChildren.get(keyToUse) || null
    // HostText
    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      return updateTextNode(returnFiber, matchedFiber, '' + newChild)
    }

    // Array types
    if (isArray(newChild)) {
      const elements = newChild as ReactNode
      return updateFragment(returnFiber, matchedFiber, elements, null)
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

    return null
  }

  function updateElement(
    returnFiber: FiberNode,
    matchedFiber: FiberNode | null,
    element: ReactElementType
  ): FiberNode {
    const elementType = element.type
    if (elementType === REACT_FRAGMENT_TYPE) {
      return updateFragment(
        returnFiber,
        matchedFiber,
        element.props.children,
        element.key
      )
    }

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

  function updateFragment(
    returnFiber: FiberNode,
    matchedFiber: FiberNode | null,
    elements: ReactNode,
    key: Key
  ): FiberNode {
    if (matchedFiber === null || matchedFiber.tag !== Fragment) {
      // mount || cannot reuse
      const created = createFiberFromFragment(elements, key)
      created.return = returnFiber
      return created
    } else {
      // reuse
      const existing = useFiber(matchedFiber, elements)
      existing.return = returnFiber
      return existing
    }
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

  function reconcileChildFibersImpl(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any
  ): FiberNode | null {
    // type checking
    const isUnkeyedTopLevelFragment =
      typeof newChild === 'object' &&
      newChild !== null &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      newChild.key === null
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild.props.children
    }

    // multi node -> <ul>li * 3</ul>
    if (isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild)
    }
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
      deleteRemainingChildren(returnFiber, currentFirstChild)
    }

    if (__DEV__) {
      console.warn('unrealized reconcile types', newChild)
    }
    return null
  }

  function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    newChild: any
  ): FiberNode | null {
    const firstChildFiber = reconcileChildFibersImpl(
      returnFiber,
      currentFirstChild,
      newChild
    )
    return firstChildFiber
  }

  return reconcileChildFibers
}

export const reconcileChildFibers = createChildReconciler(true)
export const mountChildFibers = createChildReconciler(false)
