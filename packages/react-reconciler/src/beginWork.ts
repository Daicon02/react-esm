import { ReactElementType } from 'shared/ReactTypes'
import { FiberNode } from './fiber'
import { UpdateQueue, processUpdateQueue } from './updateQueue'
import {
  FunctionComponent,
  HostComponent,
  HostRoot,
  HostText,
} from './workTags'
import { mountChildFibers, reconcileChildFibers } from './childFibers'
import { renderWithHooks } from './fiberHooks'
export const beginWork = (wip: FiberNode): FiberNode | null => {
  // compare and return new fiberNode
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      return null
    case FunctionComponent:
      return updateFunctionComponent(wip)
    default:
      if (__DEV__) {
        console.warn('unrealized type in beginWork', wip.tag)
      }
      return null
  }
}

// first render: reactDom.createRoot(root).render(<App/>)
// memorizedState = <App/> -> son of hostRootFiber && type === ReactElementType
function updateHostRoot(wip: FiberNode): FiberNode | null {
  const baseState = wip.memorizedState
  const updateQueue = wip.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending
  updateQueue.shared.pending = null
  const { memorizedState } = processUpdateQueue(baseState, pending)
  wip.memorizedState = memorizedState

  const nextChildren = wip.memorizedState

  reconcileChildren(wip, nextChildren)

  return wip.child
}

// eg: <div><span/></div>
function updateHostComponent(wip: FiberNode): FiberNode | null {
  const nextProps = wip.pendingProps
  const nextChildren = nextProps.children
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function updateFunctionComponent(wip: FiberNode): FiberNode | null {
  const nextChildren = renderWithHooks(wip)
  reconcileChildren(wip, nextChildren)
  return wip.child
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
  const current = wip.alternate

  if (current !== null) {
    // update -> track side effects
    wip.child = reconcileChildFibers(wip, current.child, children)
  } else {
    // mount -> not track side effects
    wip.child = mountChildFibers(wip, null, children)
  }
}
