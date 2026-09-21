import { useEffect, useRef } from 'react'

const STAR_COUNT = 4500 // more = a denser, brighter swirl
const HAZE_COUNT = 260 // big soft blobs along the arms that give the swirl its glow
const ARMS = 2 // spiral arms
const TURNS = 1.15 // how tightly each arm winds around the centre
const SPIN_SPEED = 0.5 // radians per second (whole spiral turns)
const FLOW_SPEED = 0.05 // how fast stars stream inward along the arms

// Picks a star colour by distance from the centre (t: 0 = core, 1 = edge):
// white-hot core -> pale green -> deep teal at the rim.
function starColor(t, alpha) {
  const r = Math.round(255 - t * 215)
  const g = Math.round(255 - t * 55)
  const b = Math.round(225 - t * 75)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// A tall mirror in a black wooden frame whose glass is a swirling green portal.
// The frame is CSS (.mirror in gate.css); the moving portal is drawn on the canvas below.
// `entering` starts the slow zoom into the portal (see .mirror--entering in gate.css).
export default function Mirror({ entering }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas
    const cx = w / 2
    const cy = h / 2
    const radius = Math.max(w, h) * 0.6 // reaches the top and bottom of the tall glass
    let frame

    // Each star sits on one spiral arm at distance t from the centre, with a little
    // sideways scatter (thicker toward the rim) so the arms look soft and cloudy.
    const stars = Array.from({ length: STAR_COUNT }, () => {
      const t = Math.pow(Math.random(), 0.75)
      return {
        t,
        arm: Math.floor(Math.random() * ARMS),
        scatter: (Math.random() - 0.5) * (0.25 + t * 0.9),
        size: 1.5 + Math.random() * 2.5,
      }
    })
    const haze = Array.from({ length: HAZE_COUNT }, () => ({
      t: Math.pow(Math.random(), 0.8),
      arm: Math.floor(Math.random() * ARMS),
      size: 14 + Math.random() * 22,
    }))
    // Position of a point on a spiral arm at distance t, given the current time
    function armPoint(arm, t, offset, time) {
      const angle = arm * ((Math.PI * 2) / ARMS) + t * TURNS * Math.PI * 2 + offset + time * SPIN_SPEED
      return [cx + Math.cos(angle) * t * radius, cy + Math.sin(angle) * t * radius]
    }

    function draw(now) {
      const time = now / 1000

      // Dark green glass, lighter toward the middle
      const glass = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.4)
      glass.addColorStop(0, '#2f9a66')
      glass.addColorStop(0.5, '#125a3d')
      glass.addColorStop(1, '#041a12')
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = glass
      ctx.fillRect(0, 0, w, h)

      // Everything below adds light on top of what's already there ('lighter'), so it glows
      ctx.globalCompositeOperation = 'lighter'

      // Soft green haze along the arms
      for (const b of haze) {
        const t = (((b.t - time * FLOW_SPEED) % 1) + 1) % 1
        const [x, y] = armPoint(b.arm, t, 0, time)
        ctx.fillStyle = `rgba(90, 255, 170, ${0.07 * (1 - t)})`
        ctx.beginPath()
        ctx.arc(x, y, b.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Stars
      for (const s of stars) {
        // Stream inward along the arm, wrapping back out at the edge
        const t = (((s.t - time * FLOW_SPEED) % 1) + 1) % 1
        const [x, y] = armPoint(s.arm, t, s.scatter, time)
        ctx.fillStyle = starColor(t, 0.7 * (1 - t * t))
        ctx.fillRect(x, y, s.size, s.size)
      }

      // Bright pulsing core
      const pulse = radius * (0.28 + Math.sin(time * 2) * 0.03)
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse)
      core.addColorStop(0, 'rgba(255, 255, 235, 0.95)')
      core.addColorStop(0.35, 'rgba(170, 255, 200, 0.45)')
      core.addColorStop(1, 'rgba(60, 200, 130, 0)')
      ctx.fillStyle = core
      ctx.fillRect(0, 0, w, h)

      frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={`mirror ${entering ? 'mirror--entering' : ''}`} aria-hidden="true">
      {/* Decorations on top of the frame (styled in gate.css) */}
      <div className="mirror__crest" />
      <div className="mirror__finial mirror__finial--left" />
      <div className="mirror__finial mirror__finial--right" />

      {/* Canvas size matches the tall glass shape so the swirl isn't stretched */}
      <div className="mirror__glass">
        <canvas ref={canvasRef} width={345} height={500} className="mirror__portal" />
      </div>
    </div>
  )
}
