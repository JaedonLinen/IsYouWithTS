import { useEffect, useRef, useState } from 'react'
import CostEstimate from './CostEstimate.jsx'
import { DESTINATIONS } from './destinations.js'
import './Destination.css'

const NAMES = [
  'Jaedon',
  'Mariah',
  'Bryce',
  'Jared',
  'Aary',
  'Jaylen',
  'Shon',
  'Other',
]

// Both words are sized from the longest one, so the lettering matches
// across the two panels and always fits the screen height.
const ROWS = Math.max(...DESTINATIONS.map((d) => d.word.length))

// Keep in sync with the .overlay opacity transition in Destination.css
const FADE_MS = 600

export default function Destination({ name, choice, onName, onChoice, onContinue }) {
  // Coming back from the Airbnb screens, the name is already known
  const [overlay, setOverlay] = useState(name ? 'gone' : 'open') // 'open' | 'closing' | 'gone'
  const selectRef = useRef(null)

  useEffect(() => {
    selectRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (overlay !== 'closing') return undefined
    const timer = setTimeout(() => setOverlay('gone'), FADE_MS)
    return () => clearTimeout(timer)
  }, [overlay])

  const unlocked = name !== ''
  const picked = DESTINATIONS.find((d) => d.id === choice)

  function handleName(event) {
    onName(event.target.value)
    setOverlay('closing')
  }

  return (
    <div className="destination" style={{ '--rows': ROWS }}>
      {/* inert = no taps, no focus, hidden from screen readers until a name is chosen */}
      <main className="split" inert={!unlocked}>
        <h1 className="sr-only">Choose a destination: Miami or Orlando/Tampa</h1>

        {DESTINATIONS.map((d) => {
          const selected = choice === d.id
          const dimmed = choice !== null && !selected
          const classes = [
            'panel',
            `panel-${d.id}`,
            selected && 'is-selected',
            dimmed && 'is-dimmed',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={d.id}
              type="button"
              className={classes}
              aria-pressed={selected}
              aria-label={d.label}
              onClick={() => onChoice(selected ? null : d.id)}
            >
              <span className="word" aria-hidden="true">
                {[...d.word].map((char, i) => (
                  <span
                    key={i}
                    className={char === '/' ? 'letter slash' : 'letter'}
                    style={{ '--i': i }}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </button>
          )
        })}

        {picked && (
          <CostEstimate key={picked.id} destination={picked} className="destination-estimate" />
        )}

        {picked ? (
          <button type="button" className="status is-continue" onClick={onContinue}>
            <span className="status-name">
              {name} · {picked.short}
            </span>
            <span>Continue</span>
          </button>
        ) : (
          <p className="status" aria-live="polite">
            <span>Choose a side</span>
          </p>
        )}
      </main>

      {overlay !== 'gone' && (
        <div
          className={overlay === 'closing' ? 'overlay is-closing' : 'overlay'}
          role="dialog"
          aria-modal="true"
          aria-labelledby="who-title"
          aria-hidden={overlay === 'closing' ? 'true' : undefined}
        >
          <div className="overlay-content">
            <h2 id="who-title">Which scuba are you?</h2>
            <label className="sr-only" htmlFor="who">
              Your name
            </label>
            <select
              id="who"
              ref={selectRef}
              className={name ? 'name-select' : 'name-select is-empty'}
              value={name}
              onChange={handleName}
              disabled={overlay === 'closing'}
            >
              <option value="" disabled>
                Select your name
              </option>
              {NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
