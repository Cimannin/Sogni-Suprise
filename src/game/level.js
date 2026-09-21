// Builds a random level: a winding chain of floating platforms with the memories
// hovering above two of them. A new layout is made every time the game starts.

const PLATFORM_COUNT = 17
const MIN_GAP = 1.8 // empty space between platform edges (kept jumpable, see physics.js)
const MAX_GAP = 3.4
const MAX_STEP_UP = 1.1 // how much higher the next platform may be
const MAX_STEP_DOWN = 0.9
const MEMORY_HOVER = 2.6 // how far above the platform a memory floats

// Every platform is a giant playing card. These are the faces they can have.
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS = ['hearts', 'diamonds', 'spades', 'clubs']

// The memories. `image` is in public/memories/, `height` is how big it floats in the world,
// `text` is what shows when the visitor presses E. Edit or add more here.
export const MEMORIES = [
  { id: 'pepsi', image: '/memories/pepsi.png', height: 3.2, text: 'She likes Pepsi Max Mango.' },
  { id: 'music', image: '/memories/currents.png', height: 3.6, text: 'She likes both Tame Impala and Justice.' },
]

const rand = (min, max) => min + Math.random() * (max - min)
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const randomCard = () => ({
  rank: RANKS[Math.floor(Math.random() * RANKS.length)],
  suit: SUITS[Math.floor(Math.random() * SUITS.length)],
})

// Straight-line empty space between the edges of two platforms (seen from above).
function edgeGap(a, b) {
  const gx = Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2)
  const gz = Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2)
  return Math.hypot(gx, gz)
}

// Does a candidate platform sit too close to any earlier one (other than the previous)?
function tooClose(c, platforms) {
  return platforms.slice(0, -1).some(
    (q) => Math.abs(c.x - q.x) < (c.w + q.w) / 2 + 1.5 && Math.abs(c.z - q.z) < (c.d + q.d) / 2 + 1.5,
  )
}

// Picks the next platform after `prev`, heading roughly in `heading` (radians).
function nextPlatform(prev, heading, platforms) {
  let fallback = null
  for (let attempt = 0; attempt < 40; attempt++) {
    const h = heading + (Math.random() - 0.5) * 1.4
    // Card proportions (5 : 7), lying either way round
    const short = rand(4.2, 5.4)
    const long = short * 1.4
    const portrait = Math.random() < 0.5
    const candidate = {
      w: portrait ? short : long,
      d: portrait ? long : short,
      card: randomCard(),
      top: clamp(prev.top + rand(-MAX_STEP_DOWN, MAX_STEP_UP), -3, 9),
      heading: h,
    }
    // Push it out along the heading until the gap is big enough
    let dist = 3
    do {
      candidate.x = prev.x + Math.sin(h) * dist
      candidate.z = prev.z + Math.cos(h) * dist
      dist += 0.25
    } while (edgeGap(prev, candidate) < rand(MIN_GAP, MIN_GAP + 0.6) && dist < 30)

    fallback = candidate
    if (edgeGap(prev, candidate) <= MAX_GAP && !tooClose(candidate, platforms)) return candidate
  }
  return fallback
}

// A winding chain of cards, starting from the Queen of Hearts.
function buildRoute() {
  const platforms = [{ x: 0, z: 0, top: 0, w: 7, d: 9.8, card: { rank: 'Q', suit: 'hearts' } }]
  let heading = Math.random() * Math.PI * 2
  while (platforms.length < PLATFORM_COUNT) {
    const p = nextPlatform(platforms[platforms.length - 1], heading, platforms)
    heading = p.heading
    platforms.push(p)
  }
  return platforms
}

// Returns { platforms, memories }.
//   platforms: [{ x, z, top, w, d, card: { rank, suit } }], platforms[0] is where the player starts.
//   memories:  [{ ...MEMORIES entry, x, y, z }] in random positions on the route.
export function generateLevel() {
  // Very rarely the random layout gets stuck and leaves a gap that's too wide to jump.
  // If so, throw it away and make a new one.
  let platforms
  do {
    platforms = buildRoute()
  } while (!platforms.every((p, i) => i === 0 || edgeGap(platforms[i - 1], p) <= MAX_GAP + 0.01))

  // One memory on a platform early in the route, one further along, in random order.
  const order = Math.random() < 0.5 ? MEMORIES : [...MEMORIES].reverse()
  const spots = [5 + Math.floor(Math.random() * 3), 12 + Math.floor(Math.random() * 4)]
  const memories = order.map((memory, i) => {
    const p = platforms[spots[i]]
    return {
      ...memory,
      x: p.x + rand(-1, 1) * (p.w / 2 - 1),
      y: p.top + MEMORY_HOVER,
      z: p.z + rand(-1, 1) * (p.d / 2 - 1),
    }
  })

  return { platforms, memories }
}
