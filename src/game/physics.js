// Player movement + collision, kept separate from the 3D drawing so it's easy to tweak.
// The player is a box that stands on platforms (boxes). No libraries, just simple maths.

export const GRAVITY = 30
export const JUMP_SPEED = 11 // about 2 units high, ~0.7s in the air
export const MOVE_SPEED = 7.5
export const PLAYER_HALF = 0.4 // half the player's width/depth
export const PLAYER_HEIGHT = 1.7
const MAX_FALL_SPEED = 30
const COYOTE_TIME = 0.12 // can still jump for a moment after walking off an edge
const JUMP_BUFFER = 0.12 // a jump pressed just before landing still counts

// How thick every platform (a giant playing card) is. Its top is at `top`.
export const PLATFORM_THICKNESS = 0.4

// Turns a platform description {x, z, top, w, d} into the box edges used for collisions.
export function platformBox(p) {
  return {
    minX: p.x - p.w / 2,
    maxX: p.x + p.w / 2,
    minZ: p.z - p.d / 2,
    maxZ: p.z + p.d / 2,
    minY: p.top - PLATFORM_THICKNESS,
    maxY: p.top,
  }
}

// `y` is the height of the player's feet.
export function createPlayer(x, y, z) {
  return { x, y, z, vx: 0, vy: 0, vz: 0, onGround: false, coyote: 0, jumpBuffer: 0 }
}

// Call when the jump key goes down.
export function pressJump(player) {
  player.jumpBuffer = JUMP_BUFFER
}

// Is the player's box inside this platform box? (Standing exactly on top doesn't count.)
function overlaps(p, b) {
  return (
    p.x + PLAYER_HALF > b.minX &&
    p.x - PLAYER_HALF < b.maxX &&
    p.z + PLAYER_HALF > b.minZ &&
    p.z - PLAYER_HALF < b.maxZ &&
    p.y + PLAYER_HEIGHT > b.minY &&
    p.y < b.maxY - 0.001
  )
}

// Move along one axis, then push the player back out of anything they ran into.
function moveAxis(p, boxes, axis, amount) {
  p[axis] += amount
  for (const b of boxes) {
    if (!overlaps(p, b)) continue
    if (axis === 'y') {
      if (amount < 0) {
        p.y = b.maxY // landed on top
        p.onGround = true
      } else {
        p.y = b.minY - PLAYER_HEIGHT // bumped their head
      }
      p.vy = 0
    } else if (axis === 'x') {
      p.x = amount > 0 ? b.minX - PLAYER_HALF : b.maxX + PLAYER_HALF
    } else {
      p.z = amount > 0 ? b.minZ - PLAYER_HALF : b.maxZ + PLAYER_HALF
    }
  }
}

// Advance the player by `dt` seconds.
// `boxes` = platforms run through platformBox(); `input` = { dirX, dirZ } the wanted
// direction on the ground (length 0 to 1).
// The cards are thin, so long frames are cut into small steps: otherwise a fast fall
// could skip straight through a card between two frames.
const MAX_STEP = 1 / 120
export function stepPlayer(p, boxes, input, dt) {
  const steps = Math.max(1, Math.ceil(dt / MAX_STEP))
  for (let i = 0; i < steps; i++) stepOnce(p, boxes, input, dt / steps)
}

function stepOnce(p, boxes, input, dt) {
  // Speed up / slow down smoothly (less control in the air)
  const k = Math.min(1, (p.onGround ? 14 : 5) * dt)
  p.vx += (input.dirX * MOVE_SPEED - p.vx) * k
  p.vz += (input.dirZ * MOVE_SPEED - p.vz) * k

  // Jumping
  p.coyote = p.onGround ? COYOTE_TIME : p.coyote - dt
  p.jumpBuffer -= dt
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = JUMP_SPEED
    p.coyote = 0
    p.jumpBuffer = 0
  }

  p.vy = Math.max(p.vy - GRAVITY * dt, -MAX_FALL_SPEED)

  // Move one axis at a time so sliding along walls works
  p.onGround = false
  moveAxis(p, boxes, 'x', p.vx * dt)
  moveAxis(p, boxes, 'z', p.vz * dt)
  moveAxis(p, boxes, 'y', p.vy * dt)
}
