import { useCallback, useEffect, useRef, useState } from 'react'
import Airbnbs from './Airbnbs.jsx'
import Destination from './Destination.jsx'
import { DESTINATIONS } from './destinations.js'
import Done from './Done.jsx'
import { buildSubmission, submitSelections } from './sheetApi.js'
import './App.css'

const DESTINATION_HASH = '#/destination'
const AIRBNBS_HASH = '#/airbnbs/'
const DONE_HASH = '#/done'
const STORAGE_KEY = 'pp-flow-v1'

const EMPTY_FLOW = {
  name: '',
  choice: null, // destination picked on the split screen
  cities: [], // cities the user is choosing Airbnbs for, in order
  selections: {}, // { [destinationId]: [bnbId, bnbId] }
  submitted: false,
}

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

function go(hash, { replace = false } = {}) {
  if (replace) window.location.replace(hash)
  else window.location.hash = hash
}

// Survives a refresh mid-flow; per tab, so nobody inherits someone else's picks.
function loadFlow() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    return saved ? { ...EMPTY_FLOW, ...saved } : EMPTY_FLOW
  } catch {
    return EMPTY_FLOW
  }
}

function otherCity(id) {
  return DESTINATIONS.find((d) => d.id !== id).id
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
          onClick={() => go(DESTINATION_HASH)}
        >
          I&apos;m with this shit
        </button>
      </div>
    </main>
  )
}

function App() {
  const hash = useHash().replace(/\/+$/, '')
  const [flow, setFlow] = useState(loadFlow)
  const [submit, setSubmit] = useState({ status: 'idle', error: null })
  const sending = useRef(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(flow))
    } catch {
      /* storage blocked - the flow still works, it just won't survive a refresh */
    }
  }, [flow])

  // Work out which screen the hash asks for, and whether it's allowed yet.
  let screen = 'home'
  let city = null
  if (hash === DESTINATION_HASH) screen = 'destination'
  else if (hash.startsWith(AIRBNBS_HASH)) {
    city = hash.slice(AIRBNBS_HASH.length)
    screen = 'airbnbs'
  } else if (hash === DONE_HASH) screen = 'done'

  let redirect = null
  if (flow.submitted && screen !== 'done' && screen !== 'home') redirect = DONE_HASH
  else if (screen === 'airbnbs' && (!flow.name || !flow.cities.includes(city)))
    redirect = DESTINATION_HASH
  else if (screen === 'done' && !flow.submitted) redirect = '#/'

  useEffect(() => {
    if (redirect) go(redirect, { replace: true })
  }, [redirect])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen, city])

  const update = (patch) => setFlow((f) => ({ ...f, ...patch }))

  const setSelection = useCallback((cityId, ids) => {
    setFlow((f) => ({ ...f, selections: { ...f.selections, [cityId]: ids } }))
  }, [])

  async function sendToSheet(cities) {
    if (sending.current || flow.submitted) return // one submission only
    const selections = {}
    for (const c of cities) {
      const ids = flow.selections[c] ?? []
      if (ids.length !== 2) return // never submit an incomplete pick
      selections[c] = ids
    }

    sending.current = true
    setSubmit({ status: 'sending', error: null })
    try {
      await submitSelections(buildSubmission(flow.name, selections))
      setFlow((f) => ({ ...f, cities, submitted: true }))
      setSubmit({ status: 'idle', error: null })
      go(DONE_HASH)
    } catch (err) {
      setSubmit({
        status: 'error',
        error: err.message || 'Something went wrong. Please try again.',
      })
    } finally {
      sending.current = false
    }
  }

  function finish() {
    setFlow(EMPTY_FLOW)
    go('#/')
  }

  if (redirect) return null

  if (screen === 'destination') {
    return (
      <Destination
        name={flow.name}
        choice={flow.choice}
        onName={(name) => update({ name })}
        onChoice={(choice) => update({ choice })}
        onContinue={() => {
          update({ cities: [flow.choice] })
          go(AIRBNBS_HASH + flow.choice)
        }}
      />
    )
  }

  if (screen === 'airbnbs') {
    const isFirst = flow.cities[0] === city
    return (
      <Airbnbs
        key={city}
        city={city}
        selected={flow.selections[city] ?? []}
        onSelect={(ids) => setSelection(city, ids)}
        askOtherCity={isFirst}
        otherCity={DESTINATIONS.find((d) => d.id === otherCity(city))}
        submit={submit}
        onDismissError={() => setSubmit({ status: 'idle', error: null })}
        // The first city's Continue asks again, so the second city needn't be dropped here
        onBack={() => go(isFirst ? DESTINATION_HASH : AIRBNBS_HASH + flow.cities[0])}
        onChooseOther={() => {
          const next = otherCity(city)
          update({ cities: [city, next] })
          go(AIRBNBS_HASH + next)
        }}
        onSubmit={() => sendToSheet(isFirst ? [city] : flow.cities)}
      />
    )
  }

  if (screen === 'done') return <Done onFinish={finish} />

  return <Home />
}

export default App
