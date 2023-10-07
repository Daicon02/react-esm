const hasPerformanceNow =
  typeof performance === 'object' && typeof performance.now === 'function'

export let getCurrentTime: () => number | DOMHighResTimeStamp

if (hasPerformanceNow) {
  const localPerformance = performance
  getCurrentTime = () => localPerformance.now()
} else {
  const localDate = Date
  const initialTime = Date.now()
  getCurrentTime = () => localDate.now() - initialTime
}

export const localSetTimeout =
  typeof setTimeout === 'function' ? setTimeout : null

export const localClearTimeout =
  typeof clearTimeout === 'function' ? clearTimeout : null

export const localSetImmediate =
  typeof setImmediate === 'function' ? setImmediate : null

export const isInputPending =
  typeof navigator !== 'undefined' &&
  navigator.scheduling !== undefined &&
  navigator.scheduling.isInputPending !== undefined
    ? navigator.scheduling.isInputPending
    : null
