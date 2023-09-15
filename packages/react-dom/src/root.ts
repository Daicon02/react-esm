// ReactDOM.createRoot(root).render(<App/>)

import {
  createContainer,
  updateContainer,
} from 'react-reconciler/src/fiberReconciler'
import { ReactElementType } from 'shared/ReactTypes'
import { Container } from './hostConfig'

export const createRoot = (container: Container) => {
  const root = createContainer(container)

  return {
    render(element: ReactElementType) {
      updateContainer(element, root)
    },
  }
}
