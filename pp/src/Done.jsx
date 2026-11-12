import './Done.css'

export default function Done({ onFinish }) {
  return (
    <main className="hero done">
      <div className="decor" aria-hidden="true">
        <span className="sun" />
        <span className="float f1">🌺</span>
        <span className="float f3">🌴</span>
      </div>

      <div className="hero-content">
        <h1>You&apos;re all set!</h1>
        <p className="done-copy">
          Thank you for helping us narrow down our Airbnb options. Your selections have been
          submitted successfully!
        </p>
        <button type="button" className="cta" onClick={onFinish}>
          Finish
        </button>
      </div>
    </main>
  )
}
