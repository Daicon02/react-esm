const supportSymbol = typeof Symbol === 'function' && Symbol.for

// property in ReactElement.$$typeof
export const REACT_ELEMENT_TYPE = supportSymbol
  ? Symbol.for('react.element')
  : 0xeac7

// property in ReactElement.type
export const REACT_FRAGMENT_TYPE = supportSymbol
  ? Symbol.for('react.fragment')
  : 0xeacb
