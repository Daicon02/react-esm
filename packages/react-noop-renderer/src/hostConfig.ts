import { FiberNode } from 'react-reconciler/src/fiber'
import { HostText } from 'react-reconciler/src/workTags'
import { Props } from 'shared/ReactTypes'

export interface Container {
  rootID: number
  children: (Instance | TextInstance)[]
}

export interface Instance {
  id: number
  type: string
  children: (Instance | TextInstance)[]
  parent: number
  props: Props
}

export interface TextInstance {
  id: number
  parent: number
  text: string
}

let instanceCount = 0

//createInstance: (type: string, props: any) => Instance
export const createInstance = (type: string, props: Props): Instance => {
  const instance: Instance = {
    id: instanceCount++,
    type,
    children: [],
    parent: -1,
    props,
  }
  return instance
}

export const createTextInstance = (content: string): TextInstance => {
  const textInstance: TextInstance = {
    id: instanceCount++,
    parent: -1,
    text: content,
  }
  return textInstance
}

export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance
) => {
  const prevParentID = child.parent
  const parentID = 'rootID' in parent ? parent.rootID : parent.id
  if (prevParentID !== -1 && prevParentID !== parentID) {
    throw new Error('Can not repeatedly mount a child')
  }
  child.parent = parentID
  parent.children.push(child)
}

export const appendChildToContainer = (parent: Container, child: Instance) => {
  const prevParentID = child.parent
  const parentID = parent.rootID
  if (prevParentID !== -1 && prevParentID !== parentID) {
    throw new Error('Can not repeatedly mount a child')
  }
  child.parent = parent.rootID
  parent.children.push(child)
}

export const appendChild = (parent: Instance, child: Instance) => {
  const prevParentID = child.parent
  const parentID = parent.id
  if (prevParentID !== -1 && prevParentID !== parentID) {
    throw new Error('Can not repeatedly mount a child')
  }
  child.parent = parentID
  parent.children.push(child)
}

export const insertInContainerBefore = (
  parent: Container,
  child: Instance,
  beforeChild: Instance
) => {
  const beforeIndex = parent.children.indexOf(beforeChild)
  if (beforeIndex === -1) {
    throw new Error('before does not exist')
  }
  const index = parent.children.indexOf(child)
  if (index !== -1) {
    parent.children.splice(index, 1)
  }
  parent.children.splice(beforeIndex, 0, child)
}

export const insertBefore = (
  parent: Instance,
  child: Instance,
  beforeChild: Instance
) => {
  const beforeIndex = parent.children.indexOf(beforeChild)
  if (beforeIndex === -1) {
    throw new Error('before does not exist')
  }
  const index = parent.children.indexOf(child)
  if (index !== -1) {
    parent.children.splice(index, 1)
  }
  parent.children.splice(beforeIndex, 0, child)
}

export const commitUpdate = (finishedWork: FiberNode) => {
  switch (finishedWork.tag) {
    case HostText:
      const content = finishedWork.memorizedProps.content
      return commitTextUpdate(finishedWork.stateNode, content)

    default:
      if (__DEV__) {
        console.warn('unrealized Update type')
      }
      break
  }
}

export const commitTextUpdate = (
  textInstance: TextInstance,
  content: string
) => {
  textInstance.text = content
}

export const removeChild = (
  parent: Instance | Container,
  child: Instance | TextInstance
) => {
  const index = parent.children.indexOf(child)
  if (index === -1) {
    throw new Error('child does not exist')
  }
  parent.children.splice(index, 1)
}

export const scheduleMicrotask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : typeof Promise === 'function'
    ? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
    : setTimeout
