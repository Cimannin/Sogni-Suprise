import { lazy, Suspense, useEffect, useState } from 'react'
import Rain from './Rain.jsx'
import Verdict from './Verdict.jsx'
import Rabbit from './Rabbit.jsx'
import Mirror from './Mirror.jsx'
import Birthday from './Birthday.jsx'
import { startAmbience } from '../audio.js'

// The 3D game (and three.js) only load when needed, and start loading while the mirror shows.
const loadGame = () => import('./Game.jsx')
const Game = lazy(loadGame)

// The sequence after the last riddle, in order:
//   praise -> important -> question (Good/Bad, waits for a click)
//   -> dark (screen goes black, music fades out)
//   -> rain (rain + ticking clock start)
//   -> ticking ("Time is ticking.")
//   -> rabbit ("Do you follow the rabbit?", waits for Yes)
//   -> mirror (the portal mirror fades in; rain and clock carry on)
//   -> enter (the camera slowly pushes into the mirror, then a bright flash)
//   -> game (the 3D platformer; rain and clock carry on)
//   -> ending (she has found every memory and jumped: the rain fades away, the birthday message appears)
// Each text phase lasts `ms`. Edit the lines or timings here.
const TEXT_PHASES = {
  praise: { text: "Well done, Wiser... you've impressed me.", ms: 6500 },
  important: { text: 'But now for something important.', ms: 5500 },
  ticking: { text: 'Time is ticking.', ms: 5000 },
}
const DARK_MS = 3000 // how long the screen takes to go fully black before the rain
const TICKING_DELAY_MS = 4000 // how long the rain and clock run before "Time is ticking."
const MIRROR_HOLD_MS = 4500 // how long the mirror is admired before we start to enter it
const ENTER_MS = 6000 // length of the zoom into the mirror (keep in sync with gate.css: enter-mirror + portalflash)

// `audio` = { ctx, fadeOutMusic }, created in Welcome.jsx at the moment the last riddle
// is answered (browsers only allow sound that starts from a click/keypress).
// `startPhase` lets the secret shortcut in App.jsx begin at 'mirror' instead of 'praise'.
export default function Finale({ audio, startPhase = 'praise' }) {
  const [phase, setPhase] = useState(startPhase)

  // Rain and clock keep going from the rain phase to the end.
  const raining = ['rain', 'ticking', 'rabbit', 'mirror', 'enter', 'game'].includes(phase)

  // Step through the two text phases with timers. Cleanup cancels them if we unmount.
  useEffect(() => {
    if (startPhase !== 'praise') return
    const { praise, important } = TEXT_PHASES
    const timers = [
      setTimeout(() => setPhase('important'), praise.ms),
      setTimeout(() => setPhase('question'), praise.ms + important.ms),
    ]
    return () => timers.forEach(clearTimeout)
  }, [startPhase])

  // Once they pick "Good" the screen goes dark: fade the music out, then start the rain.
  useEffect(() => {
    if (phase !== 'dark') return
    audio?.fadeOutMusic(DARK_MS / 1000)
    const timer = setTimeout(() => setPhase('rain'), DARK_MS)
    return () => clearTimeout(timer)
  }, [phase, audio])

  // Let the rain and clock settle in, say "Time is ticking.", then ask about the rabbit.
  useEffect(() => {
    if (phase === 'rain') {
      const timer = setTimeout(() => setPhase('ticking'), TICKING_DELAY_MS)
      return () => clearTimeout(timer)
    }
    if (phase === 'ticking') {
      const timer = setTimeout(() => setPhase('rabbit'), TEXT_PHASES.ticking.ms)
      return () => clearTimeout(timer)
    }
  }, [phase])

  // Once the mirror shows: preload the game, then after a pause start entering it, then start the game.
  useEffect(() => {
    if (phase === 'mirror') {
      loadGame()
      const timer = setTimeout(() => setPhase('enter'), MIRROR_HOLD_MS)
      return () => clearTimeout(timer)
    }
    if (phase === 'enter') {
      const timer = setTimeout(() => setPhase('game'), ENTER_MS)
      return () => clearTimeout(timer)
    }
  }, [phase])

  // Start the rain + clock sound once the rain begins; stop it on cleanup.
  useEffect(() => {
    if (!raining || !audio) return
    return startAmbience(audio.ctx)
  }, [raining, audio])

  const line = TEXT_PHASES[phase]

  return (
    <div className="finale">
      {/* The Good/Bad question stays on screen (fading out) while the black comes in */}
      {(phase === 'question' || phase === 'dark') && (
        <Verdict leaving={phase === 'dark'} onGood={() => setPhase('dark')} />
      )}

      {/* Black cover that fades in during the "dark" phase */}
      <div className={`finale__blackout ${phase === 'dark' || raining ? 'finale__blackout--on' : ''}`} />

      {raining && <Rain over={phase === 'game'} />}

      {/* Sits above the black cover and the rain so it can be seen and clicked */}
      <div className="finale__front">
        {/* key={phase} makes the new line fade in fresh. Its animation runs for the whole
            phase (fade in, hold, fade out), a little shorter so there's a breath between. */}
        {line && (
          <p key={phase} className="finale__text" style={{ animationDuration: `${line.ms - 500}ms` }}>
            {line.text}
          </p>
        )}
        {phase === 'rabbit' && <Rabbit onYes={() => setPhase('mirror')} />}
        {(phase === 'mirror' || phase === 'enter') && <Mirror entering={phase === 'enter'} />}
        {phase === 'enter' && <div className="finale__portalflash" />}
        {phase === 'ending' && <Birthday />}
        {phase === 'game' && (
          <Suspense fallback={null}>
            <Game onComplete={() => setPhase('ending')} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
