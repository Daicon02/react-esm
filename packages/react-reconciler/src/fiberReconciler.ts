import { FiberNode, FiberRootNode } from './fiber'
import { HostRoot } from './workTags'
import { Container } from 'hostConfig'
import { ReactElementType } from 'shared/ReactTypes'
import { scheduleUpdateRootOnFiber } from './workLoop'
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
} from './updateQueue'

export const createContainer = (container: Container): FiberRootNode => {
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

// first render: reactDom.createRoot(root).render(<App/>)

export const updateContainer = (
  element: ReactElementType | null,
  root: FiberRootNode
): ReactElementType | null => {
  const hostRootFiber = root.current
  const update = createUpdate<ReactElementType | null>(element)
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
    update
  )
  scheduleUpdateRootOnFiber(hostRootFiber)
  return element
}
