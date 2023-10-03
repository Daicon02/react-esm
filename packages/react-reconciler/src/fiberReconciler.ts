import { FiberNode, FiberRootNode } from './fiber'
import { HostRoot } from './workTags'
import { Container } from 'hostConfig'
import { ReactElementType } from 'shared/ReactTypes'
import { scheduleUpdateOnFiber } from './workLoop'
import {
  UpdateQueue,
  createUpdate,
  createUpdateQueue,
  enqueueUpdate,
} from './fiberUpdateQueue'
import { requestUpdateLane } from './fiberLane'

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
  const lane = requestUpdateLane()
  const update = createUpdate<ReactElementType | null>(element, lane)
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
    update
  )
  scheduleUpdateOnFiber(hostRootFiber, lane)
  return element
}
