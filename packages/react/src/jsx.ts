import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import {
  Key,
  Props,
  ReactElementType,
  Ref,
  Type,
  ElementType,
} from 'shared/ReactTypes'

// ReactElement
const ReactElement = function (
  type: Type,
  key: Key,
  ref: Ref,
  props: Props
): ReactElementType {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: 'react-esm',
  }
  return element
}

export const jsx = (
  type: ElementType,
  config: any,
  ...maybeChildren: any[]
): ReactElementType => {
  let key: Key = null
  const props: Props = {}
  let ref: Ref = null

  for (const prop in config) {
    const val = config[prop]
    if (prop === 'key') {
      key = val !== undefined ? '' + val : key
      continue
    }
    if (prop === 'ref') {
      ref = ref !== undefined ? val : ref
      continue
    }
    if ({}.hasOwnProperty.call(config, prop)) {
      props[prop] = val
    }
  }

  const maybeChildrenLength = maybeChildren.length
  if (maybeChildrenLength) {
    props.children =
      maybeChildrenLength === 1 ? maybeChildren[0] : maybeChildren
  }

  return ReactElement(type, key, ref, props)
}

export const jsxDEV = (type: ElementType, config: any): ReactElementType => {
  let key: Key = null
  const props: Props = {}
  let ref: Ref = null

  for (const prop in config) {
    const val = config[prop]
    if (prop === 'key') {
      key = val !== undefined ? '' + val : key
      continue
    }
    if (prop === 'ref') {
      ref = ref !== undefined ? val : ref
      continue
    }
    if ({}.hasOwnProperty.call(config, prop)) {
      props[prop] = val
    }
  }

  return ReactElement(type, key, ref, props)
}
