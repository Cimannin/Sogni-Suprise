import * as THREE from 'three'

// Draws the giant playing cards that the platforms are made of.
//   makeCardMaterials(card, w, d) -> the 6 materials for a box (top = card face, bottom = card back)

const PIXELS_PER_UNIT = 56 // texture sharpness
const RED = '#a01018'
const BLACK = '#14181a'
const PAPER = '#ebe4d0'

// Draws one suit symbol centred on (x, y), about `size` wide. Drawn with shapes, not text,
// so it looks the same on every computer.
function drawSuit(ctx, suit, x, y, size) {
  const r = size / 2
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = suit === 'hearts' || suit === 'diamonds' ? RED : BLACK
  ctx.beginPath()
  if (suit === 'diamonds') {
    ctx.moveTo(0, -r)
    ctx.lineTo(r * 0.7, 0)
    ctx.lineTo(0, r)
    ctx.lineTo(-r * 0.7, 0)
    ctx.closePath()
  } else if (suit === 'hearts' || suit === 'spades') {
    if (suit === 'spades') ctx.scale(1, -1) // a spade is an upside-down heart with a stem
    ctx.moveTo(0, r * 0.9)
    ctx.bezierCurveTo(-r * 1.4, r * 0.1, -r * 0.9, -r * 0.9, 0, -r * 0.35)
    ctx.bezierCurveTo(r * 0.9, -r * 0.9, r * 1.4, r * 0.1, 0, r * 0.9)
  } else {
    // clubs: three circles
    ctx.arc(0, -r * 0.45, r * 0.42, 0, Math.PI * 2)
    ctx.moveTo(-r * 0.4 + r * 0.42, r * 0.25)
    ctx.arc(-r * 0.4, r * 0.25, r * 0.42, 0, Math.PI * 2)
    ctx.moveTo(r * 0.4 + r * 0.42, r * 0.25)
    ctx.arc(r * 0.4, r * 0.25, r * 0.42, 0, Math.PI * 2)
  }
  ctx.fill()
  if (suit === 'spades' || suit === 'clubs') {
    ctx.beginPath() // stem
    ctx.moveTo(-r * 0.12, r * 0.2)
    ctx.lineTo(r * 0.12, r * 0.2)
    ctx.lineTo(r * 0.3, r * 0.95)
    ctx.lineTo(-r * 0.3, r * 0.95)
    ctx.fill()
  }
  ctx.restore()
}

function makeTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// The face of a card: paper, a border, the rank and a small suit in two corners, a big suit in the middle.
function faceTexture({ rank, suit }, w, d) {
  return makeTexture(Math.round(w * PIXELS_PER_UNIT), Math.round(d * PIXELS_PER_UNIT), (ctx, cw, ch) => {
    const ink = suit === 'hearts' || suit === 'diamonds' ? RED : BLACK
    const unit = Math.min(cw, ch)
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, cw, ch)
    ctx.strokeStyle = ink
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 3
    ctx.strokeRect(unit * 0.07, unit * 0.07, cw - unit * 0.14, ch - unit * 0.14)
    ctx.globalAlpha = 1

    // Corners: rank with a small suit under it, the bottom-right one turned upside down
    const corner = (x, y, turn) => {
      ctx.save()
      ctx.translate(x, y)
      if (turn) ctx.rotate(Math.PI)
      ctx.fillStyle = ink
      ctx.font = `bold ${unit * 0.2}px Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(rank, 0, 0)
      drawSuit(ctx, suit, 0, unit * 0.2, unit * 0.16)
      ctx.restore()
    }
    corner(unit * 0.2, unit * 0.2, false)
    corner(cw - unit * 0.2, ch - unit * 0.2, true)

    drawSuit(ctx, suit, cw / 2, ch / 2, unit * 0.55) // big suit in the centre
  })
}

// The back of every card: deep red with a white border and a diamond lattice. One shared texture.
let backMaterial = null
function cardBackMaterial() {
  if (!backMaterial) {
    const texture = makeTexture(128, 180, (ctx, w, h) => {
      ctx.fillStyle = '#5a0a10'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(235, 228, 208, 0.5)'
      ctx.lineWidth = 2
      for (let i = -h; i < w + h; i += 16) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + h, h)
        ctx.moveTo(i, 0)
        ctx.lineTo(i - h, h)
        ctx.stroke()
      }
      ctx.lineWidth = 6
      ctx.strokeStyle = PAPER
      ctx.strokeRect(6, 6, w - 12, h - 12)
    })
    backMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })
  }
  return backMaterial
}

const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d0bb, roughness: 0.9 })

// Box face order is [+x, -x, +y (top), -y (bottom), +z, -z].
export function makeCardMaterials(card, w, d) {
  const face = new THREE.MeshStandardMaterial({ map: faceTexture(card, w, d), roughness: 0.75 })
  return [edgeMaterial, edgeMaterial, face, cardBackMaterial(), edgeMaterial, edgeMaterial]
}
