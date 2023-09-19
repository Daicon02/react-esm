import currentDispatcher, {
  Dispatcher,
  resolveDispatcher,
} from './src/currentDispatcher'
import { jsx, isValidElement as isValidElementFn } from './src/jsx'

export const useState: Dispatcher['useState'] = (initialState) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
  currentDispatcher,
}

export const version = '0.0.0'
// TODO export jsx/jsxDEV accroding to the enviroment
export const createElement = jsx
export const isValidElement = isValidElementFn
