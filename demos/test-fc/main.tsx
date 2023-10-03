import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

export const App = () => {
  const [num, setNum] = useState(0)
  useEffect(() => {
    console.log('App mount')
  }, [])

  useEffect(() => {
    console.log('num change create', num)
    return () => {
      console.log('num change destroy', num)
    }
  }, [num])

  return (
    <div onClick={() => setNum(num + 1)}>{num === 0 ? <Child /> : 'noop'}</div>
  )
}

export function Child() {
  useEffect(() => {
    console.log('child mount')
    return () => console.log('child unmount')
  }, [])
  return <GrandSon />
}

export function GrandSon() {
  useEffect(() => {
    console.log('Grandson mount')
    return () => console.log('GrandSon unmount')
  }, [])
  return <div>GrandSon</div>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
