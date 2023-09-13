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

export function createContainer(container: Container): FiberRootNode {
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  const root = new FiberRootNode(container, hostRootFiber)
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

// first render: reactDom.createRoot(root).render(<App/>)

export function updateContainer(
  element: ReactElementType | null,
  root: FiberRootNode
) {
  const hostRootFiber = root.current
  const update = createUpdate<ReactElementType | null>(element)
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<ReactElementType | null>,
    update
  )
  scheduleUpdateRootOnFiber(hostRootFiber)
  return element
}
