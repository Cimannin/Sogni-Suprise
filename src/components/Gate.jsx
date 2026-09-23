import { useRef, useState } from 'react'

// The name that opens the gate (compared case-insensitively, trimmed).
const SECRET_NAME = 'wizer'

// How long the gate takes to fade out before we tell App to show Welcome.
// Keep this in sync with the `gate-out` animation duration in gate.css.
const LEAVE_MS = 1200

// Shown on a wrong name — a hint toward SECRET_NAME, not a random creepy line anymore.
const HINT = 'A name she was given, because she is wise.'

export default function Gate({ onEnter }) {
  const [name, setName] = useState('')
  const [refusal, setRefusal] = useState('') // message under the input ('' = none)
  const [shaking, setShaking] = useState(false) // adds the .shake class to the input
  const [flashKey, setFlashKey] = useState(0) // changing this key restarts the red flash
  const [leaving, setLeaving] = useState(false) // true while fading out on success
  const inputRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault() // stop the browser reloading the page
    if (leaving) return

    if (name.trim().toLowerCase() === SECRET_NAME) {
      // Correct: fade the gate out, then hand over to the Welcome screen.
      setRefusal('')
      setLeaving(true)
      setTimeout(onEnter, LEAVE_MS)
    } else {
      // Wrong: shake the input, flash red, show the hint, and let them retry.
      setRefusal(HINT)
      setShaking(true)
      setFlashKey((k) => k + 1)
      setName('')
      inputRef.current?.focus()
    }
  }

  return (
    <main className={`screen gate ${leaving ? 'gate--leaving' : ''}`}>
      {/* Red flash overlay. The changing key remounts it so the animation replays. */}
      {flashKey > 0 && <div key={flashKey} className="gate__flash" />}

      <h1 className="gate__title">Who dares wake me?</h1>

      {/* Fades in after the title (delay is set in CSS). Focus it once visible. */}
      <form
        className="gate__form"
        onSubmit={handleSubmit}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) inputRef.current?.focus()
        }}
      >
        <input
          ref={inputRef}
          className={`gate__input ${shaking ? 'shake' : ''}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onAnimationEnd={() => setShaking(false)} // let it shake again next time
          placeholder="Speak your name..."
          aria-label="Your name"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
        />
        <button className="gate__button" type="submit" disabled={leaving}>
          Enter
        </button>

        {/* aria-live so screen readers announce the refusal */}
        <p className="gate__refusal" aria-live="polite">
          {refusal}
        </p>
      </form>
    </main>
  )
}
