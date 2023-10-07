import reactConfig from './react.config'
import reactDomConfig from './react-dom.config'
import reactNoopRenderer from './react-noop-renderer.config'
import schedulerConfig from './scheduler.config'

export default () => {
  return [
    ...reactConfig,
    ...reactDomConfig,
    ...reactNoopRenderer,
    ...schedulerConfig,
  ]
}
