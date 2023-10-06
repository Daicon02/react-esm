import {
  createContainer,
  updateContainer,
} from 'react-reconciler/src/fiberReconciler'
import { ReactElementType } from 'shared/ReactTypes'
import { Container, Instance } from './hostConfig'
import { isArray } from 'shared/utils'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols'
import * as Scheduler from 'scheduler'

let idCounter = 0

export const createRoot = () => {
  const container: Container = {
    rootID: idCounter++,
    children: [],
  }
  // @ts-ignore
  const root = createContainer(container)

  function getChildren(parent: Container | Instance) {
    if (parent) {
      return parent.children
    }
    return null
  }

  function getChildrenAsJSX(root: Container) {
    const children = childToJSX(getChildren(root))
    if (isArray(children)) {
      const element: ReactElementType = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: REACT_FRAGMENT_TYPE,
        key: null,
        ref: null,
        props: { children },
        __mark: 'react-esm',
      }
      return element
    }
    return children
  }

  function childToJSX(child: any): any {
    // TextNode
    if (typeof child === 'string' || typeof child === 'number') {
      return '' + child
    }

    // Array
    if (isArray(child)) {
      if (child.length === 0) {
        return null
      }
      if (child.length === 1) {
        return childToJSX(child[0])
      }
      const children: any[] = child.map(childToJSX)
      if (
        children.every(
          (child) => typeof child === 'string' || typeof child === 'number'
        )
      ) {
        return children.join('')
      }
      // [Instance, TextInstance]
      return children
    }

    // Instance
    if (isArray(child.children)) {
      const inst: Instance = child
      const children = childToJSX(inst.children)
      const props = inst.props

      if (children !== null) {
        props.children = children
      }

      const element: ReactElementType = {
        $$typeof: REACT_ELEMENT_TYPE,
        type: inst.type,
        key: null,
        ref: null,
        props,
        __mark: 'react-esm',
      }
      return element
    }

    // TextInstance
    return child.text
  }

  return {
    _Scheduler: Scheduler,
    render(element: ReactElementType) {
      return updateContainer(element, root)
    },
    getChildren() {
      return getChildren(container)
    },
    getChildrenAsJSX() {
      return getChildrenAsJSX(container)
    },
  }
}
