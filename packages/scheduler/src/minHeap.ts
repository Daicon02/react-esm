export type Heap<T extends Node> = T[]

export interface Node {
  id: number
  sortIndex: number
}

export const peek = <T extends Node>(heap: Heap<T>): T | null => {
  return heap.length === 0 ? null : heap[0]
}

export const push = <T extends Node>(heap: Heap<T>, node: T) => {
  const index = heap.length
  heap.push(node)
  siftUp(heap, node, index)
}

export const pop = <T extends Node>(heap: Heap<T>): T | null => {
  if (heap.length === 0) {
    return null
  }
  const first = heap[0]
  const last = heap.pop() as T
  if (first !== last) {
    heap[0] = last
    siftDown(heap, last, 0)
  }
  return first
}

function siftUp<T extends Node>(heap: Heap<T>, node: T, index: number) {
  let i = index
  while (i > 0) {
    const parentIdx = (i - 1) >>> 1
    const parent = heap[parentIdx]
    if (compare(parent, node)) {
      // true -> need adjust
      heap[parentIdx] = node
      heap[i] = parent
      i = parentIdx
    } else {
      return
    }
  }
}

function siftDown<T extends Node>(heap: Heap<T>, node: T, index: number) {
  let i = index
  const length = heap.length
  const halfLength = length >>> 1
  while (i < halfLength) {
    const rightChildIdx = (i + 1) << 1
    const leftChildIdx = rightChildIdx - 1
    const rightChild = rightChildIdx < length ? heap[rightChildIdx] : null
    const leftChild = leftChildIdx < length ? heap[leftChildIdx] : null

    if (leftChild !== null && compare(node, leftChild)) {
      if (rightChild !== null && compare(leftChild, rightChild)) {
        heap[i] = rightChild
        heap[rightChildIdx] = node
        i = rightChildIdx
      } else {
        heap[i] = leftChild
        heap[leftChildIdx] = node
        i = leftChildIdx
      }
    } else if (rightChild !== null && compare(node, rightChild)) {
      heap[i] = rightChild
      heap[rightChildIdx] = node
      i = rightChildIdx
    } else {
      return
    }
  }
}

// compare: if A > B return true
function compare<T extends Node>(A: T, B: T): boolean {
  return A.sortIndex !== B.sortIndex ? A.sortIndex > B.sortIndex : A.id > B.id
}
