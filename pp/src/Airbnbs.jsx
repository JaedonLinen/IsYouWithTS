import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { imagesFor } from './bnbImages.js'
import CostEstimate from './CostEstimate.jsx'
import { DESTINATIONS, estimateTotal } from './destinations.js'
import { fetchListings } from './sheetApi.js'
import './Airbnbs.css'

const MAX_PICKS = 2
const STACK_DEPTH = 3 // cards drawn at once (top card + two peeking behind)
const FLY_MS = 280 // keep in sync with .card transition in Airbnbs.css
const DRAG_START_PX = 8 // movement before a press counts as a drag, not a tap

function money(n) {
  if (n === null) return '—'
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function show(n) {
  return n === null ? '—' : String(n)
}

// Shrinks the text until it fits on one line of its box (never grows past the CSS size).
function useFitText(text) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const fit = () => {
      el.style.fontSize = ''
      const base = parseFloat(getComputedStyle(el).fontSize)
      if (el.scrollWidth > el.clientWidth) {
        el.style.fontSize = `${Math.floor(base * (el.clientWidth / el.scrollWidth) * 10) / 10}px`
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    document.fonts?.ready.then(fit)
    return () => observer.disconnect()
  }, [text])

  return ref
}

function Icon({ name }) {
  const paths = {
    back: <path d="M15 5l-7 7 7 7" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    next: <path d="M9 5l7 7-7 7" />,
    heart: (
      <path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z" />
    ),
  }
  return (
    <svg
      className={`icon icon-${name}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Card({ listing, depth, photoIndex, onPhoto, selected, full, onToggle, dragX, flying }) {
  const images = imagesFor(listing.id)
  const photo = images.length ? photoIndex % images.length : 0
  const nameRef = useFitText(listing.name)
  const isTop = depth === 0

  // warm the browser cache for the photos either side of the current one
  useEffect(() => {
    if (!isTop || images.length < 2) return
    for (const step of [1, -1]) {
      new Image().src = images[(photo + step + images.length) % images.length]
    }
  }, [isTop, images, photo])

  let transform
  if (isTop && flying) transform = `translateX(${flying * 130}%) rotate(${flying * 22}deg)`
  else if (isTop) transform = `translateX(${dragX}px) rotate(${dragX / 22}deg)`
  else transform = `translate(${depth * 14}px, ${depth * 6}px) scale(${1 - depth * 0.05})`

  const classes = [
    'card',
    selected && 'is-selected',
    isTop && dragX !== 0 && !flying && 'is-dragging',
  ]
    .filter(Boolean)
    .join(' ')

  // Show at most 7 dots, sliding along with the current photo
  const dotCount = Math.min(images.length, 7)
  const dotStart = Math.min(Math.max(photo - 3, 0), images.length - dotCount)

  const step = (delta) => onPhoto((photo + delta + images.length) % images.length)

  return (
    <article
      className={classes}
      style={{
        transform,
        zIndex: STACK_DEPTH - depth,
        backgroundImage: images.length ? `url("${images[photo]}")` : undefined,
      }}
      inert={!isTop}
      aria-hidden={!isTop || undefined}
      aria-label={listing.name}
    >
      <div className="card-shade" aria-hidden="true" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="photo-zone photo-zone-left"
            aria-label="Next photo"
            onClick={() => step(1)}
          />
          <button
            type="button"
            className="photo-zone photo-zone-right"
            aria-label="Previous photo"
            onClick={() => step(-1)}
          />
        </>
      )}

      <div className="chips">
        <span className="chip" title="Minutes from the city">
          <span aria-hidden="true">🏙️</span> {show(listing.minsCity)} min
          <small>city</small>
        </span>
        <span className="chip" title="Minutes from the beach">
          <span aria-hidden="true">🏖️</span> {show(listing.minsBeach)} min
          <small>beach</small>
        </span>
      </div>

      {selected && <span className="picked-badge">Picked</span>}

      <div className="circles">
        <span className="circle" title="Beds">
          <b>{show(listing.beds)}</b>
          <small>beds</small>
        </span>
        <span className="circle" title="Bathrooms">
          <b>{show(listing.baths)}</b>
          <small>baths</small>
        </span>
        <span className="circle" title="Single-bed bedrooms">
          <b>{show(listing.singleBedrooms)}</b>
          <small>single</small>
        </span>
        <span className="circle" title="Rating">
          <b>{show(listing.rating)}</b>
          <small>★</small>
        </span>
        <button
          type="button"
          className={selected ? 'circle heart is-on' : 'circle heart'}
          aria-pressed={selected}
          aria-disabled={!selected && full ? true : undefined}
          aria-label={selected ? `Remove ${listing.name}` : `Pick ${listing.name}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggle}
        >
          <Icon name="heart" />
        </button>
      </div>

      <div className="card-info">
        <h2 ref={nameRef} className="card-name">
          {listing.name}
        </h2>
        <div className="card-meta">
          <span className="card-sub">
            {listing.city}
            {listing.bedrooms !== null && ` · ${listing.bedrooms} bedrooms`}
            {listing.reviewCount !== null && ` · ${listing.reviewCount} reviews`}
          </span>
          <span className="price">
            <b>{money(listing.cost)}</b>
            <small>{money(listing.perPerson)} / person</small>
          </span>
        </div>
      </div>

      {dotCount > 1 && (
        <div className="dots" aria-hidden="true">
          {Array.from({ length: dotCount }, (_, i) => (
            <span key={i} className={dotStart + i === photo ? 'dot is-on' : 'dot'} />
          ))}
        </div>
      )}
    </article>
  )
}

export default function Airbnbs({
  city,
  selected,
  onSelect,
  askOtherCity,
  otherCity,
  submit,
  onDismissError,
  onBack,
  onChooseOther,
  onSubmit,
}) {
  const destination = DESTINATIONS.find((d) => d.id === city)
  const [data, setData] = useState({ status: 'loading', listings: [], error: null })
  const [index, setIndex] = useState(0)
  const [photos, setPhotos] = useState({}) // listing id -> photo index
  const [asking, setAsking] = useState(false)
  const [hint, setHint] = useState('')
  const [dragX, setDragX] = useState(0)
  const [flying, setFlying] = useState(0) // -1 / 1 while the top card leaves
  const drag = useRef(null)
  const suppressClick = useRef(false)

  // starts out 'loading'; a retry resets to that before calling this again
  const load = useCallback(() => {
    fetchListings()
      .then((all) =>
        setData({
          status: 'ready',
          listings: all.filter((l) => l.destination === city),
          error: null,
        }),
      )
      .catch((err) =>
        setData({ status: 'error', listings: [], error: err.message || 'Could not load Airbnbs.' }),
      )
  }, [city])

  useEffect(load, [load])

  const { listings } = data
  const count = listings.length

  // Drop saved picks that are no longer in the sheet
  useEffect(() => {
    if (data.status !== 'ready') return
    const known = selected.filter((id) => listings.some((l) => l.id === id))
    if (known.length !== selected.length) onSelect(known)
  }, [data.status, listings, selected, onSelect])

  useEffect(() => {
    if (!hint) return undefined
    const timer = setTimeout(() => setHint(''), 2400)
    return () => clearTimeout(timer)
  }, [hint])

  const move = useCallback(
    (delta) => {
      if (count) setIndex((i) => (i + delta + count) % count)
    },
    [count],
  )

  const dialogOpen = asking || submit.status !== 'idle'

  useEffect(() => {
    if (dialogOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'ArrowRight') move(1)
      if (e.key === 'ArrowLeft') move(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogOpen, move])

  function toggle(id) {
    if (selected.includes(id)) onSelect(selected.filter((x) => x !== id))
    else if (selected.length >= MAX_PICKS) setHint('You already picked 2 — unheart one to swap.')
    else onSelect([...selected, id])
  }

  // ---- swipe the top card away (either direction = next card) ----
  function onPointerDown(e) {
    if (flying || (e.pointerType === 'mouse' && e.button !== 0)) return
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_START_PX) return
      d.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDragX(dx)
  }

  function onPointerUp(e) {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved) return
    suppressClick.current = true // the release shouldn't also flip a photo
    const width = e.currentTarget.getBoundingClientRect().width
    if (Math.abs(dragX) > Math.min(110, width * 0.28)) {
      setFlying(Math.sign(dragX))
      setTimeout(() => {
        setFlying(0)
        setDragX(0)
        move(1)
      }, FLY_MS)
    } else {
      setDragX(0)
    }
  }

  function onClickCapture(e) {
    if (suppressClick.current) {
      suppressClick.current = false
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const ready = selected.length === MAX_PICKS
  const stack = Array.from({ length: Math.min(STACK_DEPTH, count) }, (_, depth) => ({
    listing: listings[(index + depth) % count],
    depth,
  }))
  const pickedListings = selected.map((id) => listings.find((l) => l.id === id)).filter(Boolean)
  const current = listings[index]

  return (
    <div className={`bnb bnb-${city}`}>
      <header className="bnb-header">
        <button type="button" className="square-btn" aria-label="Back" onClick={onBack}>
          <Icon name="back" />
        </button>
        <div className="bnb-title">
          <h1>Airbnb&apos;s</h1>
          <p>{destination.short}</p>
        </div>
        <button
          type="button"
          className={ready ? 'square-btn continue is-ready' : 'square-btn continue'}
          disabled={!ready || dialogOpen}
          aria-label={ready ? 'Continue' : `Continue (pick ${MAX_PICKS - selected.length} more)`}
          onClick={() => (askOtherCity ? setAsking(true) : onSubmit())}
        >
          <Icon name="check" />
        </button>
      </header>

      <main className="stage" inert={dialogOpen}>
        {data.status === 'loading' && (
          <div className="card card-placeholder" aria-busy="true">
            <p>Loading Airbnbs…</p>
          </div>
        )}

        {data.status === 'error' && (
          <div className="card card-placeholder">
            <p>Couldn&apos;t load the Airbnbs.</p>
            <small>{data.error}</small>
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setData({ status: 'loading', listings: [], error: null })
                load()
              }}
            >
              Try again
            </button>
          </div>
        )}

        {data.status === 'ready' && count === 0 && (
          <div className="card card-placeholder">
            <p>No Airbnbs listed for {destination.short} yet.</p>
          </div>
        )}

        {count > 0 && (
          <div
            className="deck"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current = null
              setDragX(0)
            }}
            onClickCapture={onClickCapture}
          >
            {stack
              .slice()
              .reverse()
              .map(({ listing, depth }) => (
                <Card
                  key={listing.id}
                  listing={listing}
                  depth={depth}
                  photoIndex={photos[listing.id] ?? 0}
                  onPhoto={(i) => setPhotos((p) => ({ ...p, [listing.id]: i }))}
                  selected={selected.includes(listing.id)}
                  full={selected.length >= MAX_PICKS}
                  onToggle={() => toggle(listing.id)}
                  dragX={depth === 0 ? dragX : 0}
                  flying={depth === 0 ? flying : 0}
                />
              ))}
          </div>
        )}

        <p className={hint ? 'hint is-on' : 'hint'} role="status">
          {hint}
        </p>
      </main>

      {count > 0 && (
        <footer className="bnb-footer" inert={dialogOpen}>
          <button type="button" className="round-btn" aria-label="Previous Airbnb" onClick={() => move(-1)}>
            <Icon name="back" />
          </button>

          <div className="footer-mid">
            <div className="slots">
              {Array.from({ length: MAX_PICKS }, (_, i) => {
                const l = pickedListings[i]
                return l ? (
                  <button
                    key={l.id}
                    type="button"
                    className="slot is-filled"
                    onClick={() => setIndex(listings.indexOf(l))}
                  >
                    <Icon name="heart" />
                    <span>{l.name}</span>
                  </button>
                ) : (
                  <span key={i} className="slot">
                    Pick {i + 1}
                  </span>
                )
              })}
            </div>
            <p className="footer-count">
              {index + 1} / {count}
              {current?.link && (
                <>
                  {' · '}
                  <a href={current.link} target="_blank" rel="noreferrer">
                    View on Airbnb ↗
                  </a>
                </>
              )}
            </p>
          </div>

          <button type="button" className="round-btn" aria-label="Next Airbnb" onClick={() => move(1)}>
            <Icon name="next" />
          </button>
        </footer>
      )}

      {dialogOpen && (
        <div className="bnb-dialog" role="dialog" aria-modal="true" aria-labelledby="bnb-dialog-title">
          <div className="bnb-dialog-box">
            {submit.status === 'sending' && (
              <>
                <span className="spinner" aria-hidden="true" />
                <h2 id="bnb-dialog-title">Saving your picks…</h2>
              </>
            )}

            {submit.status === 'error' && (
              <>
                <h2 id="bnb-dialog-title">That didn&apos;t go through</h2>
                <p>{submit.error}</p>
                <div className="dialog-actions">
                  <button type="button" className="pill-btn is-green" onClick={onSubmit}>
                    Try again
                  </button>
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={() => {
                      onDismissError()
                      setAsking(false)
                    }}
                  >
                    Back to Airbnbs
                  </button>
                </div>
              </>
            )}

            {submit.status === 'idle' && (
              <>
                <CostEstimate destination={destination} />
                <h2 id="bnb-dialog-title">
                  Would you like to choose two Airbnbs from the other city as well?
                </h2>
                <p className="dialog-note">
                  {otherCity.short} is about ${estimateTotal(otherCity).toLocaleString('en-US')} per
                  person.
                </p>
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="pill-btn is-green"
                    onClick={() => {
                      setAsking(false)
                      onChooseOther()
                    }}
                  >
                    Yes, choose from {otherCity.short}
                  </button>
                  <button type="button" className="pill-btn" onClick={onSubmit}>
                    No, continue
                  </button>
                </div>
                <button type="button" className="text-btn" onClick={() => setAsking(false)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
