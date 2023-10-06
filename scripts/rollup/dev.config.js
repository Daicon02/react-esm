import reactConfig from './react.config'
import reactDomConfig from './react-dom.config'
import reactNoopRenderer from './react-noop-renderer.config'

export default () => {
  return [...reactConfig, ...reactDomConfig, ...reactNoopRenderer]
}
