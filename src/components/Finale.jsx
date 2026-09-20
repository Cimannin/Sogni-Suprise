import { useEffect, useState } from 'react'
import Rain from './Rain.jsx'
import Verdict from './Verdict.jsx'
import Rabbit from './Rabbit.jsx'
import Mirror from './Mirror.jsx'
import { startAmbience } from '../audio.js'

// The sequence after the last riddle, in order:
//   praise -> important -> question (Good/Bad, waits for a click)
//   -> dark (screen goes black, music fades out)
//   -> rain (rain + ticking clock start)
//   -> ticking ("Time is ticking.")
//   -> rabbit ("Do you follow the rabbit?", waits for Yes)
//   -> mirror (the portal mirror fades in; rain and clock carry on)
// Each text phase lasts `ms`. Edit the lines or timings here.
const TEXT_PHASES = {
  praise: { text: "Well done, Wizer... you've impressed me.", ms: 6500 },
  important: { text: 'But now for something important.', ms: 5500 },
  ticking: { text: 'Time is ticking.', ms: 5000 },
}
const DARK_MS = 3000 // how long the screen takes to go fully black before the rain
const TICKING_DELAY_MS = 4000 // how long the rain and clock run before "Time is ticking."

// `audio` = { ctx, fadeOutMusic }, created in Welcome.jsx at the moment the last riddle
// is answered (browsers only allow sound that starts from a click/keypress).
export default function Finale({ audio }) {
  const [phase, setPhase] = useState('praise')

  // Rain and clock keep going from the rain phase to the end.
  const raining = ['rain', 'ticking', 'rabbit', 'mirror'].includes(phase)

  // Step through the two text phases with timers. Cleanup cancels them if we unmount.
  useEffect(() => {
    const { praise, important } = TEXT_PHASES
    const timers = [
      setTimeout(() => setPhase('important'), praise.ms),
      setTimeout(() => setPhase('question'), praise.ms + important.ms),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

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

      {raining && <Rain />}

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
        {phase === 'mirror' && <Mirror />}
      </div>
    </div>
  )
}
