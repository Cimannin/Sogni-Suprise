import * as THREE from 'three'

// Alice, built from simple 3D shapes: long black hair, blue dress with puffed sleeves,
// bloodied white apron, striped stockings, black boots and a bloody knife.
// She stands with her feet at y = 0 and faces +z. The engine moves and turns `root`.
//
//   const alice = createAlice()
//   scene.add(alice.root)
//   alice.update(dt, { speed, onGround, vy })   // call every frame

const COLOR = { skin: 0xf1d6c6, blue: 0x1d47cc, white: 0xeee8da, black: 0x0d0d12, hair: 0x08080b, blood: 0x8a1015 }
const HIP_Y = 0.86 // height of the hips: the legs and the upper body pivot here
const RUN_SPEED = 7.5 // the speed at which the run animation is at full swing

const lerp = (a, b, t) => a + (b - a) * t

// Draws onto a small canvas and turns it into a texture (no image files needed).
function makeTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Black and white bands for the stockings. `repeats` = how many stripe pairs along the leg.
function stripeMaterial(repeats) {
  const texture = makeTexture(4, 32, (ctx) => {
    ctx.fillStyle = '#0d0d12'
    ctx.fillRect(0, 0, 4, 16)
    ctx.fillStyle = '#eee8da'
    ctx.fillRect(0, 16, 4, 16)
  })
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, repeats)
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 })
}

// White apron cloth splattered with blood.
function apronMaterial() {
  const texture = makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#eee8da'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 34; i++) {
      const x = Math.random() * w
      const y = h * (0.15 + Math.random() * 0.85)
      const r = 2 + Math.random() * 13
      ctx.fillStyle = `rgba(138, 16, 21, ${0.55 + Math.random() * 0.4})`
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      for (let j = 0; j < 3; j++) {
        // little droplets flung off each splat
        ctx.beginPath()
        ctx.arc(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, 1 + Math.random() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      if (r > 8) ctx.fillRect(x - 1.5, y, 3, 10 + Math.random() * 30) // a drip running down
    }
  })
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide })
}

const solid = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material)
  m.position.set(x, y, z)
  return m
}

// One leg. `hip` swings the whole leg; `knee` bends the lower part (stocking + boot).
function makeLeg(side) {
  const hip = new THREE.Group()
  hip.position.set(side * 0.1, HIP_Y, 0)
  hip.add(mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.42, 10), stripeMaterial(7), 0, -0.21, 0)) // thigh

  const knee = new THREE.Group()
  knee.position.y = -0.42
  knee.add(mesh(new THREE.CylinderGeometry(0.053, 0.05, 0.16, 10), stripeMaterial(3), 0, -0.08, 0)) // shin stocking
  const black = solid(COLOR.black, { roughness: 0.6 })
  knee.add(mesh(new THREE.CylinderGeometry(0.078, 0.07, 0.28, 10), black, 0, -0.3, 0)) // boot shaft
  knee.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.25), black, 0, -0.4, 0.05)) // foot
  knee.add(mesh(new THREE.BoxGeometry(0.11, 0.06, 0.08), black, 0, -0.415, -0.06)) // chunky heel
  hip.add(knee)
  return { hip, knee }
}

// One arm. `shoulder` swings the arm; `elbow` bends the forearm. `side` is +1 or -1 (which side of the body).
function makeArm(side) {
  const shoulder = new THREE.Group()
  shoulder.position.set(side * 0.2, 1.38 - HIP_Y, 0)
  const skin = solid(COLOR.skin)
  const sleeve = mesh(new THREE.SphereGeometry(0.1, 12, 10), solid(COLOR.blue, { emissive: 0x081a55 }))
  sleeve.scale.set(1, 0.9, 1) // the puffed sleeve
  shoulder.add(sleeve)
  shoulder.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12), solid(COLOR.white), 0, -0.09, 0)) // white cuff
  shoulder.add(mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.26, 8), skin, 0, -0.17, 0)) // upper arm

  const elbow = new THREE.Group()
  elbow.position.y = -0.3
  elbow.add(mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.24, 8), skin, 0, -0.12, 0)) // forearm
  elbow.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), skin, 0, -0.26, 0)) // hand
  shoulder.add(elbow)
  return { shoulder, elbow }
}

// The bloody knife, held in the hand. It points along the forearm.
function makeKnife() {
  const knife = new THREE.Group()
  knife.position.y = -0.26
  knife.add(mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), solid(0x2a1a12), 0, -0.01, 0)) // handle
  knife.add(mesh(new THREE.BoxGeometry(0.075, 0.014, 0.022), solid(0x444444, { metalness: 0.6 }), 0, -0.065, 0)) // guard
  knife.add(mesh(new THREE.BoxGeometry(0.042, 0.3, 0.01), solid(0xc9cdd2, { metalness: 0.8, roughness: 0.3 }), 0, -0.22, 0)) // blade
  knife.add(mesh(new THREE.BoxGeometry(0.044, 0.15, 0.012), solid(COLOR.blood, { roughness: 0.4 }), 0, -0.3, 0)) // blood on the blade
  return knife
}

export function createAlice() {
  const root = new THREE.Group()
  const body = new THREE.Group() // bounces a little as she runs
  root.add(body)

  // ----- Legs -----
  const legA = makeLeg(1)
  const legB = makeLeg(-1)
  body.add(legA.hip, legB.hip)

  // ----- Upper body: everything above the hips, so it can lean as one piece -----
  const upper = new THREE.Group()
  upper.position.y = HIP_Y
  body.add(upper)

  const blue = solid(COLOR.blue, { emissive: 0x081a55 })
  const apron = apronMaterial()

  // Bodice
  upper.add(mesh(new THREE.CylinderGeometry(0.17, 0.125, 0.54, 14), blue, 0, 0.27, 0))
  // Apron bib on the chest, with two straps over the shoulders
  upper.add(mesh(new THREE.CylinderGeometry(0.163, 0.131, 0.38, 12, 1, true, -0.7, 1.4), apron, 0, 0.19, 0))
  for (const side of [1, -1]) {
    const strap = mesh(new THREE.BoxGeometry(0.03, 0.2, 0.012), solid(COLOR.white), side * 0.09, 0.44, 0.15)
    strap.rotation.z = side * -0.15
    upper.add(strap)
  }
  // Neck
  upper.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 8), solid(COLOR.skin), 0, 0.6, 0))

  // Skirt (flared blue cone) with the apron panel on the front and a white frill at the hem
  const skirt = new THREE.Group()
  skirt.position.y = -0.02
  skirt.add(mesh(new THREE.CylinderGeometry(0.2, 0.46, 0.36, 20, 1, true), solid(COLOR.blue, { emissive: 0x081a55, side: THREE.DoubleSide }), 0, -0.16, 0))
  skirt.add(mesh(new THREE.CylinderGeometry(0.206, 0.466, 0.36, 16, 1, true, -0.85, 1.7), apron, 0, -0.16, 0))
  skirt.add(mesh(new THREE.CylinderGeometry(0.47, 0.475, 0.05, 20, 1, true), solid(COLOR.white, { side: THREE.DoubleSide }), 0, -0.33, 0))
  upper.add(skirt)

  // Apron bow at the back
  const white = solid(COLOR.white)
  for (const side of [1, -1]) {
    const loop = mesh(new THREE.SphereGeometry(0.07, 10, 8), white, side * 0.09, 0.05, -0.17)
    loop.scale.set(1.3, 0.7, 0.4)
    upper.add(loop)
  }
  upper.add(mesh(new THREE.SphereGeometry(0.035, 8, 8), white, 0, 0.05, -0.17))

  // ----- Arms (the knife is in the arm on the -x side) -----
  const armA = makeArm(1)
  const armB = makeArm(-1)
  armB.elbow.add(makeKnife())
  upper.add(armA.shoulder, armB.shoulder)

  // ----- Head -----
  const head = new THREE.Group()
  head.position.y = 1.5 - HIP_Y
  upper.add(head)
  const face = mesh(new THREE.SphereGeometry(0.13, 20, 16), solid(COLOR.skin), 0, 0.09, 0)
  face.scale.set(0.95, 1.1, 0.95)
  head.add(face)
  // Eyes: pale green with dark pupils and heavy eyeliner
  for (const side of [1, -1]) {
    head.add(mesh(new THREE.SphereGeometry(0.022, 8, 8), solid(0xa8d890), side * 0.05, 0.1, 0.115))
    head.add(mesh(new THREE.SphereGeometry(0.011, 6, 6), solid(0x000000), side * 0.05, 0.1, 0.133))
    head.add(mesh(new THREE.BoxGeometry(0.07, 0.014, 0.012), solid(0x000000), side * 0.05, 0.127, 0.115))
  }
  head.add(mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), solid(0x6a1018), 0, 0.03, 0.122)) // lips

  // Hair: a cap over the back and sides of the head, a fringe, two front locks
  // and a long back section that swings (see `hairBack` in update).
  const hairMat = solid(COLOR.hair, { roughness: 0.5, side: THREE.DoubleSide })
  const capBack = mesh(new THREE.SphereGeometry(0.148, 18, 14, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7), hairMat, 0, 0.105, -0.015)
  const fringe = mesh(new THREE.SphereGeometry(0.149, 14, 8, Math.PI / 2 - 0.9, 1.8, 0, 0.75), hairMat, 0, 0.105, -0.015)
  head.add(capBack, fringe)
  for (const side of [1, -1]) {
    const lock = mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.34, 8), hairMat, side * 0.12, -0.05, 0.03)
    lock.rotation.z = side * 0.06
    head.add(lock)
  }
  const hairBack = new THREE.Group()
  hairBack.position.set(0, 0.14, -0.1)
  const hairLong = mesh(new THREE.CylinderGeometry(0.12, 0.075, 0.62, 12), hairMat, 0, -0.3, -0.04)
  hairLong.scale.z = 0.8
  hairBack.add(hairLong)
  // A few strands either side so the back of the hair isn't one flat slab
  for (const side of [1, -1]) {
    const strand = mesh(new THREE.CylinderGeometry(0.045, 0.02, 0.55, 8), hairMat, side * 0.085, -0.28, -0.06)
    strand.rotation.z = side * -0.05
    hairBack.add(strand)
  }
  head.add(hairBack)

  // ----- Animation state -----
  const state = { phase: 0, walk: 0, air: 0, fall: 0, time: 0 }

  // Poses the body every frame from how she's moving.
  //   speed    = horizontal speed on the ground
  //   onGround = standing on a card
  //   vy       = vertical speed (up is positive)
  function update(dt, { speed, onGround, vy }) {
    state.time += dt
    const ease = 1 - Math.exp(-12 * dt)
    state.walk += ((onGround ? Math.min(speed / RUN_SPEED, 1) : 0) - state.walk) * ease
    state.air += ((onGround ? 0 : 1) - state.air) * ease
    state.fall += ((onGround ? 0 : Math.min(Math.max(-vy / 15, 0), 1)) - state.fall) * ease
    state.phase += dt * (3 + speed * 1.5) // faster steps when moving faster

    const w = state.walk
    const a = state.air
    const rise = Math.min(Math.max(vy / 8, 0), 1) // 1 while shooting upward, 0 when falling
    const s = Math.sin(state.phase) // walk cycle: legs swing opposite to each other
    const c = Math.cos(state.phase)

    // Legs: swing at the hip, bend at the knee while the leg swings forward.
    // (In the air one leg tucks up and the other trails behind.)
    legA.hip.rotation.x = lerp(-s * 0.85 * w, -0.6, a)
    legA.knee.rotation.x = lerp(Math.max(0, c) * 0.9 * w, 0.8 * (0.6 + 0.4 * rise), a)
    legB.hip.rotation.x = lerp(s * 0.85 * w, 0.3, a)
    legB.knee.rotation.x = lerp(Math.max(0, -c) * 0.9 * w, 0.4 * (0.6 + 0.4 * rise), a)

    // Arms swing opposite to the legs. In the air they lift out to the sides for balance.
    const lift = 0.7 + 0.5 * state.fall
    armA.shoulder.rotation.x = lerp(s * 0.7 * w, -0.25, a)
    armA.shoulder.rotation.z = lerp(0.06, lift, a)
    armA.elbow.rotation.x = lerp(-0.3 - Math.max(0, -s) * 0.4 * w, -0.4, a)
    armB.shoulder.rotation.x = lerp(-s * 0.25 * w, -0.25, a) // knife arm swings less
    armB.shoulder.rotation.z = lerp(-0.06, -lift, a)
    armB.elbow.rotation.x = lerp(-1.1, -0.8, a) // forearm held forward, knife out in front

    // Body: bounces with each step, leans into the run, breathes when still
    body.position.y = Math.abs(s) * 0.07 * w * (1 - a) + Math.sin(state.time * 1.8) * 0.004 * (1 - w)
    upper.rotation.x = 0.12 * w - 0.05 * a
    upper.rotation.y = -s * 0.12 * w // shoulders twist against the hips

    // Skirt flares and lifts as she falls; hair streams out behind and settles back
    const flare = 0.06 * a + 0.06 * state.fall + 0.025 * w
    skirt.scale.set(1 + flare, 1 - 0.12 * state.fall, 1 + flare)
    hairBack.rotation.x =
      0.05 + 0.3 * w + 0.5 * state.fall + Math.sin(state.time * 2) * 0.03 + Math.sin(state.phase * 2) * 0.06 * w
    head.rotation.x = -0.08 * w
  }

  return { root, update }
}
