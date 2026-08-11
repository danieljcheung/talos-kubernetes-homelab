import { describe, expect, test } from "vitest"
import { buildOrbSamples } from "../components/three/orb-geometry"
import { buildOrbMessageMask, buildWordPoints } from "../components/three/orb-masks"
import type { SoulMessage } from "../components/three/scene-types"

const arbitraryMessage: SoulMessage = {
  id: "hi",
  visual: "A-Z '",
  announcement: "A to Z",
  width: 0.9,
  height: 0.3,
}

describe("orb masks", () => {
  test("builds deterministic front-only masks for any supported message", () => {
    const samples = buildOrbSamples("low")
    const first = buildOrbMessageMask(samples, arbitraryMessage)
    const second = buildOrbMessageMask(samples, arbitraryMessage)
    expect(first).toEqual(second)
    expect(first).toHaveLength(samples.length)
    expect(first.some((value, index) => value > 0 && samples[index].normal[2] > 0)).toBe(true)
    expect(first.every((value, index) => samples[index].normal[2] > 0 || value === 0)).toBe(true)
  })

  test("distributes word points across cells without square stretching or row-major truncation", () => {
    const first = buildWordPoints("ABOUT", 10)
    const second = buildWordPoints("ABOUT", 10)
    expect(first).toEqual(second)
    expect(first).toHaveLength(10)
    expect(first.every(({ x, y, seed }) => x >= -0.5 && x <= 0.5 && y >= -0.5 && y <= 0.5 && seed >= 0 && seed < 1)).toBe(true)
    expect(first.some(({ y }) => y < 0)).toBe(true)
    expect(first.some(({ y }) => y > 0)).toBe(true)
    const width = Math.max(...first.map(({ x }) => x)) - Math.min(...first.map(({ x }) => x))
    const height = Math.max(...first.map(({ y }) => y)) - Math.min(...first.map(({ y }) => y))
    expect(width).toBeGreaterThan(height)
  })
})
