import { Dispatcher } from 'shared/ReactInternalTypes'

const currentDispatcher: { current: Dispatcher | null } = {
  current: null,
}

export const resolveDispatcher = (): Dispatcher => {
  const dispatcher = currentDispatcher.current

  if (dispatcher === null) {
    throw new Error('hooks can only run in FC')
  }
  return dispatcher
}

export default currentDispatcher
