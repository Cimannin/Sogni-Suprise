import { useEffect, useRef } from 'react'

// Full-screen falling rain drawn on a canvas. Fades in via the .rain CSS class.
// `over` lifts it above the 3D game so the rain falls across the world.
export default function Rain({ over }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let drops = []
    let frame

    // One raindrop. `depth` (0.4 to 1) makes far drops slower, shorter and fainter.
    function makeDrop() {
      const depth = 0.4 + Math.random() * 0.6
      return {
        x: Math.random() * (canvas.width + 200),
        y: Math.random() * canvas.height,
        len: 10 * depth + Math.random() * 12 * depth,
        speed: 9 * depth + Math.random() * 4,
        alpha: 0.07 + depth * 0.16,
      }
    }

    // Match the canvas to the window and scale the drop count to its width.
    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      drops = Array.from({ length: Math.round(canvas.width / 8) }, makeDrop)
    }

    const WIND = 0.2 // sideways drift: fraction of fall speed

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.lineWidth = 1
      for (const d of drops) {
        ctx.strokeStyle = `rgba(170, 210, 210, ${d.alpha})`
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * WIND, d.y + d.len)
        ctx.stroke()

        d.y += d.speed
        d.x -= d.speed * WIND
        // Off the bottom (or left): respawn above the top
        if (d.y > canvas.height || d.x < -50) {
          d.y = -d.len
          d.x = Math.random() * (canvas.width + 200)
        }
      }
      frame = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={over ? 'rain rain--over' : 'rain'} aria-hidden="true" />
}
