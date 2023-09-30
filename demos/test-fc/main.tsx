import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

export const App = () => {
  const [num, setNum] = useState(100)

  const arr =
    num % 2 === 0
      ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
      : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]

  return (
    <div
      onClickCapture={() => {
        setNum((num) => num + 1)
        setNum((num) => num + 1)
        setNum((num) => num + 1)
      }}
    >
      {num}
    </div>
  )
}

export function Child() {
  const [display, setDisplay] = useState(true)
  return (
    <div>
      {display && (
        <div>
          <div>
            <div>
              <div>
                <span>react-esm</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setDisplay(!display)}>click</button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
