import { useEffect, useState } from 'react'
import Gate from './components/Gate.jsx'
import Welcome from './components/Welcome.jsx'

// ---------- SECRET SHORTCUT (temporary: delete this block, the effect below and the
// `skip` state when it's no longer needed) ----------
// Press Up, Up, A, B on the gate screen to jump straight to the mirror.
const SECRET_CODE = ['ArrowUp', 'ArrowUp', 'KeyA', 'KeyB']

// App decides which "screen" is showing.
// Everyone starts at the Gate; once the Gate calls onEnter, we swap to Welcome.
export default function App() {
  const [entered, setEntered] = useState(false)
  const [skip, setSkip] = useState(null) // set by the secret code: { audio }

  // Watch for the secret code while the gate is showing.
  useEffect(() => {
    if (entered || skip) return
    let progress = 0 // how many keys of the code have been pressed in a row
    function onKeyDown(e) {
      if (e.repeat) return
      if (e.code === SECRET_CODE[progress]) progress++
      else progress = e.code === SECRET_CODE[0] ? 1 : 0
      if (progress < SECRET_CODE.length) return

      // The mirror scene has rain and a clock. Browsers only allow sound that starts from a
      // key press or click, so the audio is created here, inside this key press.
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      setSkip({ audio: AudioCtx ? { ctx: new AudioCtx(), fadeOutMusic: () => {} } : null })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [entered, skip])

  if (skip) return <Welcome skipToMirror initialAudio={skip.audio} />
  return entered ? <Welcome /> : <Gate onEnter={() => setEntered(true)} />
}
