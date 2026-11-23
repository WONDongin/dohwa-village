import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { buildings, Village } from './village.jsx'
import './style.css'

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [position, setPosition] = useState({ x: 10, y: 9 })

  useEffect(() => {
    function handlePopState() {
      setPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(nextPath) {
    window.history.pushState(null, '', nextPath)
    setPath(nextPath)
  }

  const page = buildings.find((building) => building.path === path)

  useEffect(() => {
    document.title = page ? `${page.name} | 도화마을` : '도화마을'
  }, [page])

  if (page) {
    return (
      <main className="content-page">
        <h1>{page.name}</h1>
        <button autoFocus onClick={() => navigate('/')}>마을로 돌아가기</button>
      </main>
    )
  }

  return <Village position={position} setPosition={setPosition} navigate={navigate} />
}

createRoot(document.getElementById('root')).render(<App />)
