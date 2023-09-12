import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { FiberNode } from './fiber'

let workInProgress: FiberNode | null

function prepareFreshStack(fiber: FiberNode) {
  workInProgress = fiber
}

function renderRoot(root: FiberNode) {
  // init
  prepareFreshStack(root)

  while (true) {
    try {
      workLoop()
      break
    } catch (e) {
      console.warn('workLoop error', e)
      workInProgress = null
    }
  }
}

function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber)
  fiber.memorizedProps = fiber.pendingProps

  if (next === null) {
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber
  while (node !== null) {
    completeWork(node)
    const sibling = node.sibling

    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    node = node.return
    workInProgress = node
  }
}
