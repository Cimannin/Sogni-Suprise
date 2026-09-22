import { useEffect, useRef, useState } from 'react'
import { HEART_LINE, INTRO_TEXT, INTRO_TYPE_SECONDS, startGame } from '../game/engine.js'
import { MEMORIES } from '../game/level.js'

// How long the screen takes to go black while she falls (keep in sync with .game__fall in gate.css).
const FALL_FADE_MS = 2800

// The 3D platformer. The world itself lives in src/game/ (three.js); this component
// just gives it a container and shows the on-screen text (prompt, memory message, help,
// and Cinnamoroll's typed-out line during the entry cinematic).
// `onComplete` is called once she has taken the leap and the screen has faded to black.
export default function Game({ onComplete }) {
  const containerRef = useRef(null)
  const [canRead, setCanRead] = useState(false) // near a memory -> show "Press E"
  const [message, setMessage] = useState(null) // last memory read: { text, id }
  const [found, setFound] = useState(0)
  const [falling, setFalling] = useState(false) // she has jumped off: fade to black
  const [introActive, setIntroActive] = useState(true) // the entry cinematic hasn't finished yet
  const [introTextShown, setIntroTextShown] = useState(false) // the camera has settled on Cinnamoroll
  const [introLine, setIntroLine] = useState('') // her line, revealed so far (typed out below)
  const [heartLineShown, setHeartLineShown] = useState(false) // "Something She never sees, yet has"
  const [heartCollected, setHeartCollected] = useState(false) // the golden heart has been picked up

  // Start the world when this appears; shut it down when it goes away.
  useEffect(() => {
    return startGame(containerRef.current, {
      onPrompt: setCanRead,
      onMemory: (text, count) => {
        setMessage({ text, id: Date.now() }) // new id replays the fade animation
        setFound(count)
      },
      onFall: () => setFalling(true),
      onIntroText: setIntroTextShown,
      onIntroEnd: () => setIntroActive(false),
      onHeartLine: setHeartLineShown,
      onHeartCollected: () => setHeartCollected(true),
    })
  }, [])

  // Types INTRO_TEXT out one character at a time once the camera settles on Cinnamoroll.
  // (No need to reset introLine when it hides — the <p> below isn't rendered while hidden.)
  useEffect(() => {
    if (!introTextShown) return
    let i = 0
    const perChar = (INTRO_TYPE_SECONDS * 1000) / INTRO_TEXT.length
    const timer = setInterval(() => {
      i++
      setIntroLine(INTRO_TEXT.slice(0, i))
      if (i >= INTRO_TEXT.length) clearInterval(timer)
    }, perChar)
    return () => clearInterval(timer)
  }, [introTextShown])

  // Once she's falling and the screen has gone black, hand over to the ending.
  useEffect(() => {
    if (!falling) return
    const timer = setTimeout(() => onComplete?.(), FALL_FADE_MS)
    return () => clearTimeout(timer)
  }, [falling, onComplete])

  return (
    <div className="game">
      <div ref={containerRef} className="game__world" />

      <div className="game__hud">
        {/* Hidden until the entry cinematic (camera -> Cinnamoroll -> back) has finished */}
        {!introActive && (
          <p className="game__count">
            Memories {found} / {MEMORIES.length}
          </p>
        )}
        {introTextShown && (
          <p className="game__intro-line">
            {introLine}
            <span className="game__caret" aria-hidden="true" />
          </p>
        )}
        {canRead && (
          <p className="game__prompt">
            Press <kbd>E</kbd>
          </p>
        )}
        {message && (
          <p key={message.id} className="game__message">
            {message.text}
          </p>
        )}
        {heartLineShown && <p className="game__heart-line">{HEART_LINE}</p>}
        {heartCollected && !falling && <p className="game__leap">Then, take the leap. Jump.</p>}
        {!introActive && (
          <p className="game__help">
            WASD to move &middot; Space to jump &middot; click, then move the mouse to look (Esc lets go) &middot; find
            the memories
          </p>
        )}
      </div>

      {/* Black that closes in while she falls */}
      {falling && <div className="game__fall" />}

      {/* Bright portal light that fades away as we arrive (matches the flash in Finale) */}
      <div className="game__arrive" />
    </div>
  )
}
