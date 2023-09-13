import { ReactElementType } from 'shared/ReactTypes'
import { FiberNode, createFiberFromElement, createFiberFromText } from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { Placement } from './fiberFlags'

function createChildReconciler(shouldTrackSideEffects: boolean) {
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    element: ReactElementType
  ): FiberNode {
    // create fiberNode from element
    const fiber = createFiberFromElement(element)
    fiber.return = returnFiber
    return fiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFirstChild: FiberNode | null,
    content: string | number
  ): FiberNode {
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
    newChild?: ReactElementType
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
    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconcileSingleTextNode(returnFiber, currentFirstChild, newChild)
      )
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
