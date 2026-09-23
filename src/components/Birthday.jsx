import { useRef } from 'react'
import { playAirhorn } from '../audio.js'

// The final message. Fades in line by line, slowly, like the words at the very start.
// Each part starts `delay` seconds after the screen appears. Edit the wording or timings here.
const PARTS = [
  { text: 'Happy birthday Sonia,', delay: 2, className: 'birthday__greeting' },
  {
    text: 'This is something small but I wanted to make something for you. You are truly an amazing person and deserve the world. Thank you for more than a year of good times.',
    delay: 5.5,
  },
  {
    text: "But to be honest, I've never met someone with such a Golden Heart like yours, you truly care for people and that really says a lot.",
    delay: 12,
  },
  { text: 'Thank you for being you and I hope you have an amazing day Wizer', delay: 18 },
]

// How long after the screen appears the button shows up — after the last line above
// has had time to fully fade in (its own delay + the ~2.8s .birthday p fade takes).
const BUTTON_DELAY = 21

export default function Birthday() {
  // Reused across clicks so we don't spin up a fresh AudioContext every press.
  const audioCtxRef = useRef(null)

  function handlePress() {
    // Created here, inside the click, because browsers only allow sound that starts
    // from a user gesture like this one.
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      audioCtxRef.current = AudioCtx ? new AudioCtx() : null
    }
    if (audioCtxRef.current) playAirhorn(audioCtxRef.current)
  }

  return (
    <div className="birthday">
      {PARTS.map((part) => (
        <p
          key={part.delay}
          className={part.className ?? 'birthday__text'}
          style={{ animationDelay: `${part.delay}s` }}
        >
          {part.text}
        </p>
      ))}

      {/* A little surprise once she's read everything. Swap the label for whatever you like. */}
      <button
        type="button"
        className="gate__button birthday__button"
        style={{ animationDelay: `${BUTTON_DELAY}s` }}
        onClick={handlePress}
      >
        Press me
      </button>
    </div>
  )
}
