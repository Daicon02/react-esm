import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

export const App = () => {
  const [num, setNum] = useState(100)
  return (
    <div>
      <Child></Child>
    </div>
  )
}

export function Child() {
  return (
    <div>
      <span>react-esm</span>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
