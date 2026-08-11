import type { OrbSample } from "./orb-geometry"
import type { SoulMessage } from "./scene-types"

const GLYPHS: Record<string, readonly string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"], C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"], D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"], E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"], F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"], G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"], H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"], I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"], J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"], K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"], L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"], M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"], N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"], O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"], P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"], Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"], R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"], S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"], T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"], U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"], V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"], W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"], X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"], Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"], Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "'": ["00100", "00100", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
}

export const SOUL_MESSAGES: readonly SoulMessage[] = [
  { id: "hi", visual: "HI", announcement: "Hi", width: 0.44, height: 0.30 },
  { id: "im", visual: "I'M", announcement: "I’m", width: 0.62, height: 0.28 },
  { id: "daniel", visual: "DANIEL", announcement: "Daniel", width: 0.90, height: 0.24 },
]

type OccupiedCell = { x: number; y: number }
type Bitmap = { rows: readonly string[]; cells: readonly OccupiedCell[]; width: number }

function buildBitmap(label: string): Bitmap {
  const rows = Array.from({ length: 7 }, () => "")
  for (const character of label.toUpperCase()) {
    const glyph = GLYPHS[character] ?? GLYPHS[" "]
    for (let row = 0; row < 7; row += 1) rows[row] += `${glyph[row]}0`
  }
  const width = rows[0]?.length ?? 0
  const cells: OccupiedCell[] = []
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rows[y][x] === "1") cells.push({ x, y })
    }
  }
  return { rows, cells, width }
}

function greatestCommonDivisor(left: number, right: number) {
  let a = Math.abs(left)
  let b = Math.abs(right)
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

function distributionStep(cellCount: number) {
  if (cellCount <= 1) return 1
  let step = Math.max(1, Math.floor(cellCount * 0.6180339887498949))
  while (greatestCommonDivisor(step, cellCount) !== 1) step += 1
  return step
}

export function buildWordPoints(label: string, count: number): readonly { x: number; y: number; seed: number }[] {
  const { cells, width } = buildBitmap(label)
  if (cells.length === 0 || count <= 0) return []
  const output = new Array<{ x: number; y: number; seed: number }>(count)
  const step = distributionStep(cells.length)
  const scale = 1 / Math.max(width, 7)

  for (let index = 0; index < count; index += 1) {
    const layer = Math.floor(index / cells.length)
    const withinLayer = index % cells.length
    const cell = cells[(withinLayer * step + layer) % cells.length]
    const seed = (index * 0.7548776662466927) % 1
    const jitterX = (seed - 0.5) * 0.5
    const jitterY = (((seed * 1.618033988749895) % 1) - 0.5) * 0.5
    output[index] = {
      x: (cell.x + 0.5 + jitterX - width / 2) * scale,
      y: (3.5 - cell.y - 0.5 - jitterY) * scale,
      seed,
    }
  }
  return output
}

export function buildOrbMessageMask(samples: readonly OrbSample[], message: SoulMessage | null): Float32Array {
  const mask = new Float32Array(samples.length)
  if (!message) return mask
  const bitmap = buildBitmap(message.visual)
  if (bitmap.width === 0) return mask

  for (let index = 0; index < samples.length; index += 1) {
    const normal = samples[index].normal
    if (normal[2] <= 0) continue
    const normalizedX = normal[0] / message.width
    const normalizedY = normal[1] / message.height
    if (normalizedX < -0.5 || normalizedX >= 0.5 || normalizedY <= -0.5 || normalizedY > 0.5) continue
    const column = Math.floor((normalizedX + 0.5) * bitmap.width)
    const row = Math.floor((0.5 - normalizedY) * 7)
    if (bitmap.rows[row]?.[column] === "1") mask[index] = 1
  }
  return mask
}
