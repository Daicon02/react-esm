import { FiberNode } from 'react-reconciler/src/fiber'
import { HostComponent, HostText } from 'react-reconciler/src/workTags'
import { DOMElement, updateFiberProps } from './SyntheticEvent'
import { Props } from 'shared/ReactTypes'

export type Container = Element
export type Instance = Element
export type TextInstance = Text

//createInstance: (type: string, props: any) => Instance
export const createInstance = (type: string, props: Props): Instance => {
  // TODO deal with props
  const element = document.createElement(type) as unknown as DOMElement
  updateFiberProps(element, props)
  return element
}

export const createTextInstance = (content: string): Text => {
  return document.createTextNode(content)
}

export const appendInitialChild = (
  parent: Instance | Container,
  child: Instance
) => {
  parent.appendChild(child)
}

export const appendChildToContainer = (
  parent: Instance | Container,
  child: Instance
) => {
  parent.appendChild(child)
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
  textInstance.textContent = content
}

export const removeChild = (parent: Instance | Container, child: Instance) => {
  parent.removeChild(child)
}
