import { useEffect, useState } from 'react'

// How long the scolding message stays before the question comes back.
const SCOLD_MS = 4500

// Bad may run away this many times. The move after that triggers the scolding instead.
const MAX_DODGES = 5

// Picks a random spot (in px, relative to the button's home position) for the Bad button
// to run to. It must be far from where it is now, and must not land on the Good button
// (which sits just to the left of Bad's home, on the same row).
function pickSpot(prev) {
  const maxX = window.innerWidth * 0.3
  const maxY = window.innerHeight * 0.25
  let spot = { x: 0, y: 0 }
  for (let i = 0; i < 20; i++) {
    spot = { x: (Math.random() * 2 - 1) * maxX, y: (Math.random() * 2 - 1) * maxY }
    const farEnough = Math.hypot(spot.x - prev.x, spot.y - prev.y) > 150
    const onGood = Math.abs(spot.y) < 70 && spot.x < 0
    if (farEnough && !onGood) break
  }
  return spot
}

// "Is Wizer good or bad?" Good continues. Bad runs away when the mouse touches it,
// and if they manage to click it anyway (touch screen, keyboard) they get scolded.
// `leaving` fades it out; `onGood` is called when Good is clicked.
export default function Verdict({ leaving, onGood }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 }) // where the Bad button has run to
  const [scolded, setScolded] = useState(false)
  const [flashKey, setFlashKey] = useState(0) // changing this replays the red flash
  const [dodges, setDodges] = useState(0) // how many times Bad has run away
  const [badGone, setBadGone] = useState(false) // true once they've chased it too long

  // After a scolding, bring the question (and the Bad button's home position) back.
  useEffect(() => {
    if (!scolded) return
    const timer = setTimeout(() => {
      setScolded(false)
      setOffset({ x: 0, y: 0 })
    }, SCOLD_MS)
    return () => clearTimeout(timer)
  }, [scolded])

  function scold() {
    setScolded(true)
    setFlashKey((k) => k + 1)
  }

  // Bad runs away from the mouse. After MAX_DODGES moves they get scolded and
  // the Bad button is removed, leaving only Good when the question comes back.
  function handleBadHover() {
    if (dodges >= MAX_DODGES) {
      setBadGone(true)
      scold()
    } else {
      setDodges(dodges + 1)
      setOffset((prev) => pickSpot(prev))
    }
  }

  return (
    <div className={`verdict ${leaving ? 'verdict--leaving' : ''}`}>
      {flashKey > 0 && <div key={flashKey} className="gate__flash" />}

      {scolded ? (
        <p className="verdict__scold" style={{ animationDuration: `${SCOLD_MS}ms` }}>
          Wrong, Wizer is an amazing person, don't dare speak ill of her.
        </p>
      ) : (
        <>
          <p className="verdict__question">Is Wizer good or bad?</p>
          <div className="verdict__buttons">
            <button className="gate__button" type="button" onClick={onGood}>
              Good
            </button>
            {!badGone && (
              <button
                className="gate__button verdict__bad"
                type="button"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
                // Only dodge a real mouse. Touch screens have no hover, so a tap can land.
                onPointerEnter={(e) => e.pointerType === 'mouse' && handleBadHover()}
                onClick={scold}
              >
                Bad
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
