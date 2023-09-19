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

function createChildReconciler(shouldTrackSideEffects: boolean) {
  function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps)
    clone.index = 0
    clone.sibling = null
    return clone
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
    const child = currentFirstChild
    // update
    if (child !== null) {
      if (child.key === key) {
        const elementType = element.type
        if (element.$$typeof === REACT_ELEMENT_TYPE) {
          if (child.type === elementType) {
            // reuse fiber
            const existing = useFiber(child, element.props)
            existing.return = returnFiber
            return existing
          }
          deleteChild(returnFiber, child)
        } else {
          if (__DEV__) {
            console.warn('unrealized react type', element)
          }
        }
      } else {
        // delete old child
        deleteChild(returnFiber, child)
      }
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
    const child = currentFirstChild
    // update
    if (child !== null) {
      if (child.tag === HostText) {
        const existing = useFiber(child, { content })
        existing.return = returnFiber
        return existing
      }
      deleteChild(returnFiber, child)
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
    }
    // TODO multi node -> <ul>li * 3</ul>

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
