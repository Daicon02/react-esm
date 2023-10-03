let syncCallbackQueue: ((...args: any) => void)[] | null = null
let isFlushingWork: boolean = false

export const scheduleSyncCallback = (callback: (...args: any) => void) => {
  if (syncCallbackQueue === null) {
    syncCallbackQueue = [callback]
  } else {
    syncCallbackQueue.push(callback)
  }
}

export const flushSyncCallbacks = () => {
  if (isFlushingWork || syncCallbackQueue === null) {
    return
  }
  isFlushingWork = true
  try {
    syncCallbackQueue.forEach((callback) => callback())
  } catch (e) {
    if (__DEV__) {
      console.error('flushSyncCallbacks wrong', e)
    }
  } finally {
    isFlushingWork = false
    syncCallbackQueue = null
  }
}
