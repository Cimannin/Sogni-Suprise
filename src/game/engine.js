import * as THREE from 'three'
import { generateLevel } from './level.js'
import { createAlice } from './alice.js'
import { createCinnamoroll } from './cinnamoroll.js'
import { createHeart } from './heart.js'
import { makeCardMaterials } from './cards.js'
import {
  PLATFORM_THICKNESS,
  createPlayer,
  platformBox,
  pressJump,
  stepPlayer,
} from './physics.js'

const FOG_COLOR = 0x03100f // same deep teal-black as the rest of the site
const INTERACT_DISTANCE = 4 // how close you must be to a memory to press E
const FALL_LIMIT = -25 // fall below this and you respawn at the start
const LEAP_DEPTH = 6 // once the golden heart is collected, falling this far below the lowest card counts as "the leap"

// ---------- The golden heart ----------
// Once every memory is found, a line appears, then the heart fades in a little in front of
// wherever she's standing, and she has to walk up to it and press E.
export const HEART_LINE = 'Something She never sees, yet has'
// The last memory's own "She likes..." message (.game__message in gate.css) takes 6s to fade
// in, hold and fade out — wait for that to clear the screen before this line appears.
const HEART_LINE_DELAY = 6.5
const HEART_LINE_HOLD = 3.6 // how long the line stays up before the heart fades in
const CAMERA_DISTANCE = 6.5

// ---------- The entry cinematic ----------
// On arrival the camera holds on Alice, pans over to Cinnamoroll, waits while she "speaks"
// (see INTRO_TEXT below), then pans back and hands control to the visitor.
export const INTRO_TEXT = "There isn't much time, gather these memories."
export const INTRO_TYPE_SECONDS = 2.2 // how long Game.jsx takes to type the line out
const INTRO = {
  panStart: 1, // wait this long (the portal-arrival flash is still fading) before panning
  panToCinna: 2.4,
  holdAtCinna: 0.6,
  holdAfterType: 1.8, // how long the line stays up once fully typed
  panBack: 2.2,
}
// Cumulative timestamps (seconds since the world appeared) for each step of the above.
const T_PAN_START = INTRO.panStart
const T_CINNA_ARRIVE = T_PAN_START + INTRO.panToCinna
const T_TYPE_START = T_CINNA_ARRIVE + INTRO.holdAtCinna
const T_TYPE_END = T_TYPE_START + INTRO_TYPE_SECONDS
const T_PANBACK_START = T_TYPE_END + INTRO.holdAfterType
const T_PANBACK_END = T_PANBACK_START + INTRO.panBack

// Eases 0..1 with a slow start and end (a smoother smoothstep), used for the camera pans.
function smootherstep(t) {
  t = Math.min(1, Math.max(0, t))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

// A soft white glow texture, drawn once on a canvas (no image file needed).
function makeAuraTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.4)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

// Puts `object` in the empty space near the start, off to the side of the route so it
// isn't in the way. Tries a few directions (left first) and takes the first one that
// leaves at least 7 units of clearance from every card.
function placeInAbyss(object, platforms) {
  const start = platforms[0]
  const next = platforms[1]
  const heading = Math.atan2(next.x - start.x, next.z - start.z) // direction of the route
  const distanceTo = (x, y, z, p) => {
    const dx = Math.max(Math.abs(x - p.x) - p.w / 2, 0)
    const dz = Math.max(Math.abs(z - p.z) - p.d / 2, 0)
    return Math.hypot(dx, y - p.top, dz)
  }
  for (const degrees of [45, -45, 70, -70, 100, -100, 130, -130]) {
    const angle = heading + (degrees * Math.PI) / 180
    const x = start.x + Math.sin(angle) * 19
    const z = start.z + Math.cos(angle) * 19
    const y = start.top + 4
    if (platforms.every((p) => distanceTo(x, y, z, p) >= 7)) {
      object.position.set(x, y, z)
      object.rotation.y = Math.atan2(start.x - x, start.z - z) // face the start
      return
    }
  }
  object.position.set(start.x, start.top - 15, start.z) // fallback: below the start card
}

// Sets up the whole 3D world inside `container` and starts the game loop.
//   onPrompt(true/false)        -> show/hide "Press E"
//   onMemory(text, foundCount)  -> a memory was read
//   onFall()                    -> every memory was found and she has jumped off into the void
//   onIntroText(true/false)     -> show/type out (or hide) INTRO_TEXT, during the entry cinematic
//   onIntroEnd()                -> the cinematic is over; movement and the HUD can appear
//   onHeartLine(true/false)     -> show/hide HEART_LINE, just before the golden heart appears
//   onHeartCollected()          -> the golden heart has been picked up
// Returns a function that shuts everything down (call it when leaving the screen).
export function startGame(container, { onPrompt, onMemory, onFall, onIntroText, onIntroEnd, onHeartLine, onHeartCollected }) {
  // `now` in the game loop below is performance.now(), which counts from when the page itself
  // loaded — not from when this world appeared (visitors may spend a minute+ on the gate,
  // riddles and finale first). The entry cinematic's timings need to count from right here.
  const startTime = performance.now() / 1000
  const level = generateLevel()
  const boxes = level.platforms.map(platformBox)

  // ---------- Renderer, scene, camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(FOG_COLOR)
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.025) // things fade into the dark with distance
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 250)

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0x4a9a90, 0x140808, 1.3))
  const moon = new THREE.DirectionalLight(0x9fd8cc, 0.7)
  moon.position.set(10, 30, 5)
  scene.add(moon)
  const playerLight = new THREE.PointLight(0xe8fff6, 26, 24) // a lantern that follows you
  scene.add(playerLight)

  // ---------- Platforms: giant playing cards with faint blood-red edges ----------
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x8a0f16 })
  for (const p of level.platforms) {
    const geometry = new THREE.BoxGeometry(p.w, PLATFORM_THICKNESS, p.d)
    const mesh = new THREE.Mesh(geometry, makeCardMaterials(p.card, p.w, p.d))
    mesh.position.set(p.x, p.top - PLATFORM_THICKNESS / 2, p.z)
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial)
    edges.position.copy(mesh.position)
    scene.add(mesh, edges)
  }

  // ---------- Atmosphere: drifting dust and far-off broken shards ----------
  const dustPositions = new Float32Array(600 * 3)
  for (let i = 0; i < 600; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 120
    dustPositions[i * 3 + 1] = Math.random() * 40 - 12
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 120
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({ color: 0x9fe8d8, size: 0.14, transparent: true, opacity: 0.5 }),
  )
  scene.add(dust)

  const shardMaterial = new THREE.MeshStandardMaterial({ color: 0x0e2a2a, flatShading: true, roughness: 1 })
  const shards = []
  for (let i = 0; i < 30; i++) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(1 + Math.random() * 3), shardMaterial)
    const angle = Math.random() * Math.PI * 2
    const radius = 35 + Math.random() * 45
    shard.position.set(Math.cos(angle) * radius, Math.random() * 40 - 12, Math.sin(angle) * radius)
    shard.scale.y = 1.5 + Math.random() * 2
    shard.userData.spin = (Math.random() - 0.5) * 0.3
    shards.push(shard)
    scene.add(shard)
  }

  // ---------- A Cinnamoroll floating in the abyss, off to one side of the start ----------
  const cinnamoroll = createCinnamoroll()
  cinnamoroll.root.scale.setScalar(1.5)
  scene.add(cinnamoroll.root)
  placeInAbyss(cinnamoroll.root, level.platforms)

  // The cinematic's shot of Cinnamoroll: parked in front of her face. She was turned to
  // face the start platform, so "in front of her face" is further along that same line.
  const cinnaPos = cinnamoroll.root.position
  const towardStart = new THREE.Vector3(level.platforms[0].x - cinnaPos.x, 0, level.platforms[0].z - cinnaPos.z).normalize()
  const cinnaShot = {
    position: cinnaPos.clone().addScaledVector(towardStart, 6.5).add(new THREE.Vector3(0, 1, 0)),
    target: cinnaPos.clone().add(new THREE.Vector3(0, 0.2, 0)),
  }

  // ---------- The player: Alice ----------
  const alice = createAlice()
  const figure = alice.root
  scene.add(figure)

  // A soft dark blob on the card under her feet, so it's easy to judge where she'll land
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  scene.add(shadow)

  const start = level.platforms[0]
  const player = createPlayer(start.x, start.top, start.z)

  // ---------- Memories: glowing images floating above the platforms ----------
  const auraTexture = makeAuraTexture()
  const loader = new THREE.TextureLoader()

  // Builds one image plane, added on top of the world as light. This tiny shader also cuts
  // out the image's dark background and fades its edges, so only the glowing artwork is left.
  function makePicture(src, height) {
    const picture = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        uniforms: { map: { value: null }, opacity: { value: 1 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform sampler2D map;
          uniform float opacity;
          varying vec2 vUv;
          void main() {
            vec3 c = max(texture2D(map, vUv).rgb - 0.02, 0.0) * 1.05; // drop the near-black background
            vec2 e = smoothstep(0.0, 0.1, vUv) * smoothstep(1.0, 0.9, vUv); // soft edges
            gl_FragColor = vec4(c * e.x * e.y * opacity, 1.0);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    loader.load(src, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      picture.material.uniforms.map.value = texture
      const aspect = texture.image.width / texture.image.height
      picture.scale.set(height * aspect, height, 1)
    })
    return picture
  }

  // For a two-image memory: which of the two is showing, as [weight A, weight B] (each
  // 0 to 1). Holds on one, crossfades to the other, holds, and crossfades back.
  function crossfadeWeights(time) {
    const HOLD = 1.8
    const FADE = 0.7
    const at = ((time % (2 * (HOLD + FADE))) + 2 * (HOLD + FADE)) % (2 * (HOLD + FADE))
    if (at < HOLD) return [1, 0]
    if (at < HOLD + FADE) {
      const t = (at - HOLD) / FADE
      return [1 - t, t]
    }
    if (at < 2 * HOLD + FADE) return [0, 1]
    const t = (at - (2 * HOLD + FADE)) / FADE
    return [t, 1 - t]
  }

  const memories = level.memories.map((data) => {
    const group = new THREE.Group()
    group.position.set(data.x, data.y, data.z)

    const pictures = (data.images ?? [data.image]).map((src) => makePicture(src, data.height))
    const aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: auraTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.85,
        fog: false,
      }),
    )
    const light = new THREE.PointLight(0xffffff, 40, 16)
    group.add(aura, light, ...pictures)
    scene.add(group)

    return { data, group, pictures, aura, light, baseY: data.y, phase: Math.random() * 6, found: false }
  })
  let foundCount = 0
  const lowestCard = Math.min(...level.platforms.map((p) => p.top))
  let leaped = false // true once the ending fall has been announced

  // The golden heart: created now (invisible until revealed), positioned once she's found
  // every memory. See the HEART_* constants above for the sequence's timings.
  const heart = createHeart()
  scene.add(heart.root)
  let heartSequenceStart = null // `time` the last memory was found; null until then
  let heartLineShown = false
  let heartRevealed = false
  let heartCollected = false
  let nearHeart = false // close enough to collect it, if it's out and not yet collected

  // ---------- Controls ----------
  const keys = {}
  let yaw = 0
  let pitch = 0.45 // camera height angle
  // Start facing the second platform so the way forward is obvious
  const first = level.platforms[1]
  yaw = Math.atan2(-(first.x - start.x), -(first.z - start.z))

  let controlsEnabled = false // set true once the entry cinematic finishes
  let currentTime = 0 // this frame's `time` (see update below), so key handlers can use it too
  let nearMemory = null // the memory close enough to read, if any
  let promptShown = false // whether "Press E" is currently on screen

  // The normal third-person camera: behind and above the player, looking at her.
  function followCameraShot() {
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const target = new THREE.Vector3(player.x, player.y + 1.2, player.z)
    const flat = Math.cos(pitch) * CAMERA_DISTANCE
    const position = new THREE.Vector3(target.x - fx * flat, target.y + Math.sin(pitch) * CAMERA_DISTANCE, target.z - fz * flat)
    return { position, target }
  }

  function tryInteract() {
    if (nearHeart && !heartCollected) {
      heartCollected = true
      heart.collect(currentTime)
      onHeartCollected()
      return
    }
    if (!nearMemory) return
    if (!nearMemory.found) {
      nearMemory.found = true
      foundCount++
      if (foundCount === memories.length) heartSequenceStart = currentTime
    }
    onMemory(nearMemory.data.text, foundCount)
  }

  function onKeyDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    if (e.repeat || !controlsEnabled) return
    keys[e.code] = true
    if (e.code === 'Space') pressJump(player)
    if (e.code === 'KeyE') tryInteract()
  }
  const onKeyUp = (e) => (keys[e.code] = false)
  const onBlur = () => Object.keys(keys).forEach((k) => (keys[k] = false))

  // Mouse look: click the world to capture the mouse (Esc releases it), or hold a button and drag.
  let dragging = false
  const canvas = renderer.domElement
  const onCanvasClick = () => canvas.requestPointerLock?.()
  const onMouseDown = () => (dragging = true)
  const onMouseUp = () => (dragging = false)
  function onMouseMove(e) {
    if (!controlsEnabled) return
    if (document.pointerLockElement !== canvas && !dragging) return
    yaw -= e.movementX * 0.003
    pitch = Math.min(1.2, Math.max(-0.2, pitch + e.movementY * 0.003))
  }

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  window.addEventListener('resize', onResize)
  window.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('click', onCanvasClick)
  document.addEventListener('mousemove', onMouseMove)

  // ---------- Game loop ----------
  let introTextShown = false // guards onIntroText so it only fires once per state

  function update(dt, time) {
    currentTime = time
    const introTime = time - startTime // seconds since this world appeared (see startTime above)

    if (controlsEnabled) {
      // Turn the camera with the arrow keys too
      if (keys.ArrowLeft) yaw += 2 * dt
      if (keys.ArrowRight) yaw -= 2 * dt
    }

    // W/A/S/D relative to where the camera is looking (no input at all until controlsEnabled)
    const forward = controlsEnabled ? (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) : 0
    const strafe = controlsEnabled ? (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) : 0
    let dirX = -Math.sin(yaw) * forward + Math.cos(yaw) * strafe
    let dirZ = -Math.cos(yaw) * forward - Math.sin(yaw) * strafe
    const length = Math.hypot(dirX, dirZ)
    if (length > 0) {
      dirX /= length
      dirZ /= length
      // Turn to face the way we're moving (the short way round)
      let turn = Math.atan2(dirX, dirZ) - figure.rotation.y
      turn = Math.atan2(Math.sin(turn), Math.cos(turn))
      figure.rotation.y += turn * Math.min(1, 14 * dt)
    }

    if (controlsEnabled) {
      stepPlayer(player, boxes, { dirX, dirZ }, dt)

      if (heartCollected) {
        // The heart is hers: this time falling off is the ending, not a respawn.
        if (!leaped && player.y < lowestCard - LEAP_DEPTH) {
          leaped = true
          onFall()
        }
      } else if (player.y < FALL_LIMIT) {
        // Fell off the world: back to the start
        Object.assign(player, createPlayer(start.x, start.top, start.z))
      }

      // The golden heart's own sequence: the line, then it fades in in front of her.
      if (heartSequenceStart !== null && !heartRevealed) {
        const elapsed = currentTime - heartSequenceStart
        if (!heartLineShown && elapsed >= HEART_LINE_DELAY) {
          heartLineShown = true
          onHeartLine(true)
        }
        if (elapsed >= HEART_LINE_DELAY + HEART_LINE_HOLD) {
          heartRevealed = true
          onHeartLine(false)
          // A little in front of wherever she's currently facing, and up at eye height.
          const fwd = { x: Math.sin(figure.rotation.y), z: Math.cos(figure.rotation.y) }
          heart.root.position.set(player.x + fwd.x * 3.5, player.y + 2, player.z + fwd.z * 3.5)
          heart.reveal(currentTime)
        }
      }
    }
    heart.update(currentTime)

    figure.position.set(player.x, player.y, player.z)
    // Before controlsEnabled, stepPlayer never runs, so player.onGround is still its
    // default (false) — override it here so she stands still instead of looking mid-air.
    alice.update(
      dt,
      controlsEnabled
        ? { speed: Math.hypot(player.vx, player.vz), onGround: player.onGround, vy: player.vy }
        : { speed: 0, onGround: true, vy: 0 },
    )

    // Shadow: on the highest card below her feet, smaller and fainter the higher she is
    let groundY = -Infinity
    for (const b of boxes) {
      if (player.x > b.minX && player.x < b.maxX && player.z > b.minZ && player.z < b.maxZ && b.maxY <= player.y + 0.05) {
        groundY = Math.max(groundY, b.maxY)
      }
    }
    shadow.visible = groundY > -Infinity
    if (shadow.visible) {
      const height = player.y - groundY
      shadow.position.set(player.x, groundY + 0.02, player.z)
      shadow.scale.setScalar(Math.max(0.35, 1.3 - height * 0.15))
      shadow.material.opacity = Math.max(0.15, 0.5 - height * 0.06)
    }
    playerLight.position.set(player.x, player.y + 3, player.z)

    // ---------- Camera: the entry cinematic, then the normal third-person follow ----------
    if (introTime < T_PAN_START) {
      const shot = followCameraShot()
      camera.position.copy(shot.position)
      camera.lookAt(shot.target)
    } else if (introTime < T_CINNA_ARRIVE) {
      const t = smootherstep((introTime - T_PAN_START) / INTRO.panToCinna)
      const from = followCameraShot()
      camera.position.lerpVectors(from.position, cinnaShot.position, t)
      camera.lookAt(new THREE.Vector3().lerpVectors(from.target, cinnaShot.target, t))
    } else if (introTime < T_PANBACK_START) {
      camera.position.copy(cinnaShot.position)
      camera.lookAt(cinnaShot.target)
      if (!introTextShown && introTime >= T_TYPE_START) {
        introTextShown = true
        onIntroText(true)
      }
    } else if (introTime < T_PANBACK_END) {
      if (introTextShown) {
        introTextShown = false
        onIntroText(false)
      }
      const t = smootherstep((introTime - T_PANBACK_START) / INTRO.panBack)
      const to = followCameraShot()
      camera.position.lerpVectors(cinnaShot.position, to.position, t)
      camera.lookAt(new THREE.Vector3().lerpVectors(cinnaShot.target, to.target, t))
    } else {
      if (!controlsEnabled) {
        controlsEnabled = true
        onIntroEnd()
      }
      const shot = followCameraShot()
      camera.position.copy(shot.position)
      camera.lookAt(shot.target)
    }

    // Memories: bob, pulse their aura, face the camera, and check if the player is close
    const playerTarget = new THREE.Vector3(player.x, player.y + 1.2, player.z)
    let closest = null
    for (const m of memories) {
      m.group.position.y = m.baseY + Math.sin(time * 1.4 + m.phase) * 0.35
      const pulse = 1 + Math.sin(time * 2 + m.phase) * 0.08
      const dim = m.found ? 0.55 : 1 // read memories glow a little softer
      m.aura.scale.setScalar(10 * pulse * dim)
      m.aura.material.opacity = 0.85 * dim
      m.light.intensity = 40 * pulse * dim

      // One picture: fully shown. Two: crossfading between them (see crossfadeWeights above).
      const pictureOpacity = m.found ? 0.6 : 1
      const weights = m.pictures.length > 1 ? crossfadeWeights(time + m.phase) : [1]
      m.pictures.forEach((picture, i) => {
        picture.material.uniforms.opacity.value = weights[i] * pictureOpacity
        picture.quaternion.copy(camera.quaternion)
      })

      const distance = m.group.position.distanceTo(playerTarget)
      if (distance < INTERACT_DISTANCE && (!closest || distance < closest.distance)) closest = { m, distance }
    }
    nearMemory = closest ? closest.m : null
    nearHeart = heartRevealed && !heartCollected && heart.root.position.distanceTo(playerTarget) < INTERACT_DISTANCE

    // No "Press E" during the cinematic — she can't act on it yet anyway.
    const showPrompt = controlsEnabled && (Boolean(nearMemory) || nearHeart)
    if (showPrompt !== promptShown) {
      promptShown = showPrompt
      onPrompt(showPrompt)
    }

    cinnamoroll.update(time)
    dust.rotation.y = time * 0.01
    for (const s of shards) s.rotation.y += s.userData.spin * dt
  }

  let frame
  let last = performance.now()
  function loop(now) {
    frame = requestAnimationFrame(loop)
    const dt = Math.min((now - last) / 1000, 0.05) // cap so a lag spike can't launch us through floors
    last = now
    update(dt, now / 1000)
    renderer.render(scene, camera)
  }
  frame = requestAnimationFrame(loop)

  // ---------- Shut down ----------
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('mouseup', onMouseUp)
    document.removeEventListener('mousemove', onMouseMove)
    if (document.pointerLockElement === canvas) document.exitPointerLock()
    renderer.dispose()
    canvas.remove()
  }
}
