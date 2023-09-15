import React from 'react'
import ReactDOM from 'react-dom/client'

export const App = () => {
  return (
    <div>
      <Child />
    </div>
  )
}

export const Child = () => {
  return (
    <div>
      <span>react-esm 111</span>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
