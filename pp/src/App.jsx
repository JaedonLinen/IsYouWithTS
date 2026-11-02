import './App.css'

function App() {
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
        <button type="button" className="cta">
          I&apos;m with this shit
        </button>
      </div>
    </main>
  )
}

export default App
