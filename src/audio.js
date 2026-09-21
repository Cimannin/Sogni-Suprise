// Rain + ticking clock, synthesised with the Web Audio API (no audio files needed).
// To use real recordings later, replace startAmbience() with code that plays your files.

const RAIN_VOLUME = 0.3 // tweak these two to taste (0 to 1)
const CLOCK_VOLUME = 0.7
const FADE_IN_SECONDS = 3

// A buffer of random noise. Everything below (rain and clicks) is filtered noise.
function makeNoiseBuffer(ctx, seconds = 2) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

// ---------- Background music ----------

// Put your own music file here (in the project's public/audio/ folder).
// If it's missing or can't be played, a built-in music-box lullaby plays instead.
const MUSIC_FILE = '/audio/idle.mp3'
const MUSIC_VOLUME = 0.5

// Fallback: a slow, eerie music-box tune in A minor, made from bell-like tones.
// Frequencies in Hz, one note per beat, 0 = a rest. Edit the array to change the tune.
const MUSIC_BOX_NOTES = [440, 523.25, 659.25, 523.25, 493.88, 587.33, 698.46, 587.33, 523.25, 659.25, 783.99, 659.25, 587.33, 493.88, 440, 0]
const MUSIC_BOX_BEAT_MS = 650

function playMusicBox(ctx, out) {
  function ping(when, freq) {
    // Two sine waves an octave apart give a bell tone that dies away quickly
    for (const [mult, volume] of [[1, 0.35], [2, 0.12]]) {
      const osc = ctx.createOscillator()
      osc.frequency.value = freq * mult
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(volume, when)
      gain.gain.exponentialRampToValueAtTime(0.001, when + 1.8)
      osc.connect(gain).connect(out)
      osc.start(when)
      osc.stop(when + 2)
    }
  }
  let i = 0
  function nextNote() {
    const freq = MUSIC_BOX_NOTES[i++ % MUSIC_BOX_NOTES.length]
    if (freq) ping(ctx.currentTime + 0.05, freq)
  }
  nextNote()
  const timer = setInterval(nextNote, MUSIC_BOX_BEAT_MS)
  return () => clearInterval(timer)
}

// Starts the background music (fading in) on an existing AudioContext.
// Call it from a click/keypress handler. Returns fadeOut(seconds), which fades it away and stops it.
export function startMusic(ctx) {
  ctx.resume()
  const volume = ctx.createGain()
  volume.gain.setValueAtTime(0, ctx.currentTime)
  volume.gain.linearRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + FADE_IN_SECONDS)
  volume.connect(ctx.destination)

  let stopMusicBox = null
  function useFallback() {
    if (!stopMusicBox) stopMusicBox = playMusicBox(ctx, volume)
  }

  const file = new Audio(MUSIC_FILE)
  file.loop = true
  ctx.createMediaElementSource(file).connect(volume)
  file.addEventListener('error', useFallback, { once: true }) // missing file / not real audio
  file.play().catch(useFallback)

  return (seconds) => {
    const now = ctx.currentTime
    volume.gain.cancelScheduledValues(now)
    volume.gain.setValueAtTime(volume.gain.value, now)
    volume.gain.linearRampToValueAtTime(0, now + seconds)
    setTimeout(() => {
      file.pause()
      stopMusicBox?.()
      volume.disconnect()
    }, seconds * 1000 + 100)
  }
}

// ---------- Rain + clock ----------

// Starts the rain and the clock on an existing AudioContext.
// Returns a function that stops them both (used as the React effect cleanup).
export function startAmbience(ctx) {
  ctx.resume() // browsers can start contexts suspended; this wakes it up
  const noise = makeNoiseBuffer(ctx)

  // Master volume: fades in slowly so the rain "starts" rather than snaps on.
  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  master.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_IN_SECONDS)
  master.connect(ctx.destination)

  // ----- Rain: a high hiss (drops) plus a low rumble (distance) -----
  function rainLayer(highpass, lowpass, volume) {
    const src = ctx.createBufferSource()
    src.buffer = noise
    src.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = highpass
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = lowpass
    const gain = ctx.createGain()
    gain.gain.value = volume
    src.connect(hp).connect(lp).connect(gain).connect(master)
    src.start()
    return src
  }
  const hiss = rainLayer(1000, 7000, RAIN_VOLUME)
  const rumble = rainLayer(20, 500, RAIN_VOLUME * 1.6)

  // ----- Clock: alternating "tick" and "tock", once a second -----
  let beat = 0
  function tick(when) {
    const isTick = beat++ % 2 === 0

    // The click: a very short burst of noise through a narrow filter
    const click = ctx.createBufferSource()
    click.buffer = noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = isTick ? 3200 : 2400 // tock is slightly lower
    bp.Q.value = 4
    const clickGain = ctx.createGain()
    clickGain.gain.setValueAtTime(CLOCK_VOLUME * 3, when)
    clickGain.gain.exponentialRampToValueAtTime(0.001, when + 0.05)
    click.connect(bp).connect(clickGain).connect(master)
    click.start(when, 0, 0.06)

    // The body: a quick low thump so it sounds like wood, not just a click
    const thump = ctx.createOscillator()
    thump.frequency.value = isTick ? 220 : 170
    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(CLOCK_VOLUME * 0.6, when)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, when + 0.12)
    thump.connect(thumpGain).connect(master)
    thump.start(when)
    thump.stop(when + 0.15)
  }
  tick(ctx.currentTime + 0.1)
  const timer = setInterval(() => tick(ctx.currentTime + 0.05), 1000)

  // Stopping fades the sound away over two seconds, then shuts everything down.
  return () => {
    clearInterval(timer)
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + 2)
    setTimeout(() => {
      hiss.stop()
      rumble.stop()
      master.disconnect() // silences any clicks already scheduled
    }, 2100)
  }
}
