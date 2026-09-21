import * as THREE from 'three'

// A Cinnamoroll (the fluffy white puppy with long ears) drifting in the abyss.
// Built from simple shapes: a big round head, a small body, floppy ears that flap,
// blue eyes, pink cheeks and a curled tail. She faces +z.
//
//   const cinna = createCinnamoroll()
//   scene.add(cinna.root)
//   cinna.update(timeInSeconds)   // call every frame

const fluff = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6f8399, roughness: 0.7 })

// A sphere squashed into an oval: (rx, ry, rz) are its half-sizes.
function blob(material, rx, ry, rz, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), material)
  m.scale.set(rx, ry, rz)
  m.position.set(x, y, z)
  return m
}

export function createCinnamoroll() {
  const root = new THREE.Group() // moved around by update()
  const body = new THREE.Group() // everything she's made of, so she can tilt as a whole
  root.add(body)

  // ----- Head and body -----
  body.add(blob(fluff, 1.15, 0.95, 1, 0, 0, 0)) // big round head
  body.add(blob(fluff, 0.55, 0.5, 0.5, 0, -1.05, -0.05)) // tiny body
  for (const side of [1, -1]) {
    body.add(blob(fluff, 0.17, 0.15, 0.2, side * 0.3, -1.45, 0.2)) // little feet
    body.add(blob(fluff, 0.14, 0.2, 0.14, side * 0.55, -0.95, 0.25)) // little arms
  }

  // ----- Face -----
  const blue = new THREE.MeshStandardMaterial({ color: 0x2f8cf0, emissive: 0x0a3a80, roughness: 0.4 })
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.5 })
  const pink = new THREE.MeshStandardMaterial({ color: 0xffb3c8, emissive: 0x552233, roughness: 0.8 })
  for (const side of [1, -1]) {
    body.add(blob(blue, 0.12, 0.16, 0.05, side * 0.42, -0.05, 0.93)) // eye
    body.add(blob(shine, 0.035, 0.04, 0.02, side * 0.44, 0.03, 0.97)) // sparkle in the eye
    body.add(blob(pink, 0.15, 0.09, 0.04, side * 0.65, -0.3, 0.76)) // rosy cheek
  }
  body.add(blob(dark, 0.06, 0.04, 0.04, 0, -0.2, 0.97)) // nose
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.009, 6, 14, Math.PI), dark)
  mouth.rotation.z = Math.PI // a smile
  mouth.position.set(0, -0.27, 0.96)
  body.add(mouth)

  // ----- Ears: long and floppy, pivoting from the top of the head so they can flap -----
  const ears = [1, -1].map((side) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.8, 0.5, 0)
    pivot.add(blob(fluff, 0.3, 1.0, 0.17, side * 0.15, -0.95, 0))
    body.add(pivot)
    return { pivot, side }
  })

  // ----- Tail: the cinnamon-roll curl -----
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 8, 20, Math.PI * 1.7), fluff)
  tail.position.set(0, -1.05, -0.6)
  body.add(tail)

  // A soft pale-blue glow behind her so she shines in the dark
  const glow = document.createElement('canvas')
  glow.width = glow.height = 128
  const ctx = glow.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(190,230,255,0.55)')
  g.addColorStop(1, 'rgba(190,230,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glow),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  )
  aura.scale.setScalar(6.5)
  root.add(aura)

  // Bob, sway and flap. `time` is in seconds.
  function update(time) {
    body.position.y = Math.sin(time * 0.9) * 0.3 // gentle up and down
    body.rotation.z = Math.sin(time * 0.6) * 0.08 // slow tilt
    body.rotation.y = Math.sin(time * 0.35) * 0.5 // turns back and forth so you see her face
    for (const { pivot, side } of ears) {
      pivot.rotation.z = side * (0.35 + Math.sin(time * 2.6 + (side > 0 ? 0 : 0.6)) * 0.22) // ears flap outward and back
    }
    tail.rotation.z = time * 1.2
  }

  return { root, update }
}
