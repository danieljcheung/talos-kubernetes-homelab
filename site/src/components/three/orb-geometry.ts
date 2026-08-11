export type OrbSample = {
  position: readonly [number, number, number]
  normal: readonly [number, number, number]
  seed: number
  heat: number
  tileSize: number
}

export const ORB_COUNTS = { low: 4500, medium: 10000, high: 18000 } as const

/** Deterministic Fibonacci sphere samples, with no image or runtime randomness. */
export function buildOrbSamples(quality: keyof typeof ORB_COUNTS, radius = 1.35): readonly OrbSample[] {
  const count = ORB_COUNTS[quality]
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const samples: OrbSample[] = new Array(count)
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (2 * (i + 0.5)) / count
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = goldenAngle * i
    const x = Math.cos(theta) * ring
    const z = Math.sin(theta) * ring
    const seed = ((i * 0.6180339887498949) % 1 + 1) % 1
    const heat = Math.min(1, Math.max(0, 0.22 + 0.78 * (1 - Math.abs(y) * 0.72)))
    samples[i] = {
      position: [x * radius, y * radius, z * radius],
      normal: [x, y, z],
      seed,
      heat,
      tileSize: 0.012 + seed * 0.006,
    }
  }
  return samples
}
