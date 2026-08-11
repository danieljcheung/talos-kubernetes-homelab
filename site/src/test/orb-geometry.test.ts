import { describe, expect, it } from "vitest"
import { buildOrbSamples, ORB_COUNTS } from "../components/three/orb-geometry"

describe("orb geometry", () => {
  it("is deterministic and quality-bounded", () => {
    for (const quality of ["low", "medium", "high"] as const) {
      const a = buildOrbSamples(quality), b = buildOrbSamples(quality)
      expect(a).toHaveLength(ORB_COUNTS[quality]); expect(a).toEqual(b)
      for (const s of a.slice(0, 100)) {
        expect(s.position.every(Number.isFinite)).toBe(true)
        expect(Math.hypot(...s.position)).toBeCloseTo(1.35, 4)
        expect(s.seed).toBeGreaterThanOrEqual(0); expect(s.seed).toBeLessThan(1)
        expect(s.heat).toBeGreaterThanOrEqual(0); expect(s.heat).toBeLessThanOrEqual(1)
      }
    }
  })
})
