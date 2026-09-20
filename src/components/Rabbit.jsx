import { useEffect, useState } from 'react'

// How long the "No" reply stays before the question comes back.
const NO_MS = 4000

// How long the question takes to fade out after "Yes" (keep in sync with .verdict--leaving in gate.css).
const LEAVE_MS = 1200

// "Do you follow the rabbit?" Yes calls onYes (after a fade). No gets a creepy reply, then
// the question returns. Reuses the .verdict styles from the Good/Bad question.
export default function Rabbit({ onYes }) {
  const [declined, setDeclined] = useState(false) // showing the reply to "No"
  const [leaving, setLeaving] = useState(false) // fading out after "Yes"

  // After the "No" reply, bring the question back.
  useEffect(() => {
    if (!declined) return
    const timer = setTimeout(() => setDeclined(false), NO_MS)
    return () => clearTimeout(timer)
  }, [declined])

  function handleYes() {
    setLeaving(true)
    setTimeout(onYes, LEAVE_MS)
  }

  return (
    <div className={`verdict ${leaving ? 'verdict--leaving' : ''}`}>
      {declined ? (
        <p className="verdict__scold" style={{ animationDuration: `${NO_MS}ms` }}>
          Then wait in the dark. I can be patient.
        </p>
      ) : (
        <>
          <p className="verdict__question">Do you follow the rabbit?</p>
          <div className="verdict__buttons">
            <button className="gate__button" type="button" onClick={handleYes}>
              Yes
            </button>
            <button className="gate__button" type="button" onClick={() => setDeclined(true)}>
              No
            </button>
          </div>
        </>
      )}
    </div>
  )
}
