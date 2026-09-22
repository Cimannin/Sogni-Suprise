import * as THREE from 'three'

// A golden heart that appears once every memory has been found. Same glowing-aura look as
// the memories in engine.js (a soft radial sprite plus a point light), just gold instead
// of white, with a heart shape painted on a canvas instead of a loaded photo.
//
//   const heart = createHeart()
//   scene.add(heart.root)
//   heart.reveal(time)     // once, when it should start fading in at its current position
//   heart.collect(time)    // once, when the visitor picks it up (it shrinks and fades away)
//   heart.update(time)     // call every frame, always (a no-op until reveal() is called)

const FADE_IN = 1.6 // seconds to fade in once revealed
const COLLECT_TIME = 0.8 // seconds to shrink away once collected

// The same soft radial glow as the memories' aura (see makeAuraTexture in engine.js), gold.
function makeAuraTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255, 222, 140, 1)')
  g.addColorStop(0.3, 'rgba(255, 195, 70, 0.5)')
  g.addColorStop(1, 'rgba(255, 195, 70, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

// A gold heart with a small bright highlight (like light catching a gem), painted on an
// otherwise transparent canvas. Kept mostly at a true gold tone, since additive blending
// (see the material below) pushes bright colours toward white — a heart-shaped gradient
// would wash out to near-white all over instead of reading as gold.
function makeHeartTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  const r = 85

  function heartPath() {
    ctx.beginPath()
    ctx.moveTo(0, r * 0.78)
    ctx.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.8, -r, 0, -r * 0.32)
    ctx.bezierCurveTo(r * 0.8, -r, r * 1.3, -r * 0.1, 0, r * 0.78)
  }

  ctx.translate(128, 140)
  ctx.fillStyle = '#c98a1a' // solid gold base
  heartPath()
  ctx.fill()

  ctx.save()
  heartPath()
  ctx.clip() // keep the highlight inside the heart shape
  const highlight = ctx.createRadialGradient(-r * 0.25, -r * 0.35, 0, -r * 0.25, -r * 0.35, r * 0.8)
  highlight.addColorStop(0, 'rgba(255, 235, 175, 0.55)')
  highlight.addColorStop(0.6, 'rgba(255, 205, 90, 0.15)')
  highlight.addColorStop(1, 'rgba(255, 205, 90, 0)')
  ctx.fillStyle = highlight
  ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3)
  ctx.restore()

  return new THREE.CanvasTexture(canvas)
}

export function createHeart() {
  const root = new THREE.Group() // positioned once, wherever the heart should appear
  const body = new THREE.Group() // bobs up and down; hidden until reveal()
  root.add(body)

  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeAuraTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }),
  )
  const picture = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeHeartTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }),
  )
  const light = new THREE.PointLight(0xffd98a, 0, 16)
  body.add(aura, picture, light)

  let revealedAt = null
  let collectedAt = null

  function reveal(time) {
    revealedAt = time
  }

  function collect(time) {
    collectedAt = time
  }

  function update(time) {
    if (revealedAt === null) {
      body.visible = false
      return
    }
    body.visible = true

    let fade = Math.min(1, (time - revealedAt) / FADE_IN)
    let burst = 1
    if (collectedAt !== null) {
      const t = Math.min(1, (time - collectedAt) / COLLECT_TIME)
      fade *= 1 - t
      burst = 1 + t * 1.5 // grows a little as it fades, like a small burst of light
    }

    body.position.y = Math.sin(time * 1.3) * 0.3
    const pulse = 1 + Math.sin(time * 2.2) * 0.08
    aura.scale.setScalar(7 * pulse * burst)
    aura.material.opacity = 0.55 * fade
    picture.scale.setScalar(1.5 * (1 + Math.sin(time * 2.2) * 0.04) * burst)
    picture.material.opacity = fade
    light.intensity = 30 * pulse * fade
  }

  return { root, reveal, collect, update }
}
