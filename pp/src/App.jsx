import { useEffect, useState } from 'react'
import Destination from './Destination.jsx'
import './App.css'

const DESTINATION_HASH = '#/destination'

// Tiny hash router. Hash URLs keep refresh and direct links working on
// GitHub Pages without server rewrites or an extra dependency.
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return hash
}

function Home() {
  return (
    <main className="hero">
      {/* Cute tropical bits. Delete this block if they clash with your photo. */}
      <div className="decor" aria-hidden="true">
        <span className="sun" />
        <span className="float f1">🌺</span>
        <span className="float f2">🍍</span>
        <span className="float f3">🌴</span>
        <span className="float f4">🥥</span>
      </div>

      <div className="hero-content">
        <h1>Is you with this shit?</h1>
        <button
          type="button"
          className="cta"
          onClick={() => {
            window.location.hash = DESTINATION_HASH
          }}
        >
          I&apos;m with this shit
        </button>
      </div>
    </main>
  )
}

function App() {
  const hash = useHash()
  const onDestination = hash.replace(/\/+$/, '') === DESTINATION_HASH

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [onDestination])

  return onDestination ? <Destination /> : <Home />
}

export default App
