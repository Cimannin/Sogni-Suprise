import { useState } from 'react'

// The riddles, asked one at a time. To add or change one, edit this list.
// `answers` = every accepted spelling, written lowercase with no leading "a"/"the".
// `hint` is shown on a wrong answer, in place of a generic "Wrong."
const RIDDLES = [
  {
    text: 'I wear your face but never keep it. Break me, and a hundred of you stare back, all screaming.',
    answers: ['mirror'],
    hint: 'You look into it every morning.',
  },
  {
    text: "It is always six o'clock where I'm served. I'm poured, sipped, and never finished.",
    answers: ['tea', 'cup of tea', 'teacup', 'tea cup', 'tea time', 'teatime'],
    hint: "Think of a certain mad party, and what's poured there.",
  },
  {
    text: 'I grow tall as the sun sets and die in the dark. I follow you but never speak.',
    answers: ['shadow'],
    hint: "It walks beside you, but only when there's light.",
  },
]

// Lowercase, trim, and drop a leading "a " / "an " / "the " so "A Mirror" matches "mirror".
function normalize(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/^(a|an|the)\s+/, '')
}

// Asks the riddles in order. Reuses the Gate's input/button/shake/flash styles.
// Calls onSolved() once, when the last riddle is answered correctly.
export default function Riddles({ onSolved }) {
  const [index, setIndex] = useState(0) // which riddle we're on
  const [answer, setAnswer] = useState('')
  const [refusal, setRefusal] = useState('')
  const [shaking, setShaking] = useState(false)
  const [flashKey, setFlashKey] = useState(0)

  const [solved, setSolved] = useState(false) // true after the last answer; ignores further input

  function handleSubmit(e) {
    e.preventDefault()
    if (solved) return

    if (RIDDLES[index].answers.includes(normalize(answer))) {
      setRefusal('')
      if (index === RIDDLES.length - 1) {
        // Last riddle answered: tell Welcome to start the finale.
        setSolved(true)
        onSolved()
      } else {
        // Correct: clear the box and move to the next riddle.
        setAnswer('')
        setIndex(index + 1)
      }
    } else {
      // Wrong: same shake + red flash as the Gate, but show a hint instead of a scold.
      setRefusal(RIDDLES[index].hint)
      setShaking(true)
      setFlashKey((k) => k + 1)
      setAnswer('')
    }
  }

  return (
    <div className="riddles">
      {flashKey > 0 && <div key={flashKey} className="gate__flash" />}

      <p className="riddles__count">
        Riddle {index + 1} of {RIDDLES.length}
      </p>

      {/* key={index} remounts the text so each new riddle fades in again */}
      <p key={index} className="riddles__text">
        {RIDDLES[index].text}
      </p>

      <form className="riddles__form" onSubmit={handleSubmit}>
        <input
          className={`gate__input ${shaking ? 'shake' : ''}`}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onAnimationEnd={() => setShaking(false)}
          placeholder="Your answer..."
          aria-label="Your answer"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          autoFocus
        />
        <button className="gate__button" type="submit">
          Answer
        </button>
        <p className="gate__refusal" aria-live="polite">
          {refusal}
        </p>
      </form>
    </div>
  )
}
