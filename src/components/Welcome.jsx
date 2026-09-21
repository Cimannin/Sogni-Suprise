import { useState } from 'react'
import Riddles from './Riddles.jsx'
import Finale from './Finale.jsx'
import { startMusic } from '../audio.js'

// How long the riddles take to fade out before the finale starts.
// Keep in sync with the `welcome__content--leaving` animation in gate.css.
const LEAVE_MS = 1500

// Shown after a visitor passes the Gate.
// stage: 'riddles' (asking them) -> 'leaving' (fading out) -> 'finale' (praise, dark, rain)
// `skipToMirror` / `initialAudio` come from the secret shortcut in App.jsx (temporary).
export default function Welcome({ skipToMirror, initialAudio }) {
  const [stage, setStage] = useState(skipToMirror ? 'finale' : 'riddles')
  const [audio, setAudio] = useState(initialAudio ?? null) // { ctx, fadeOutMusic }, or null if no audio support

  // Called by Riddles when the last riddle is answered correctly.
  function handleSolved() {
    // Create the audio context and start the background music right here, inside the
    // visitor's Enter/click, because browsers block sound that doesn't start from a user action.
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) {
      const ctx = new AudioCtx()
      setAudio({ ctx, fadeOutMusic: startMusic(ctx) })
    }

    setStage('leaving')
    setTimeout(() => setStage('finale'), LEAVE_MS)
  }

  return (
    <main className="screen welcome">
      {stage === 'finale' ? (
        <Finale audio={audio} startPhase={skipToMirror ? 'mirror' : 'praise'} />
      ) : (
        <div className={`welcome__content ${stage === 'leaving' ? 'welcome__content--leaving' : ''}`}>
          <h1 className="welcome__title">Wizer, now I want you to answer these riddles.</h1>
          <Riddles onSolved={handleSolved} />
        </div>
      )}
    </main>
  )
}
