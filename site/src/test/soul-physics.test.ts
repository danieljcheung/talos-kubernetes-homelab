import { describe, expect, it } from "vitest"
import { stepSoulSpring } from "../components/three/soul-physics"

describe("soul physics", () => {
  it("dents toward press target and remains bounded", () => {
    let s = { value: 0, velocity: 0 }
    for (let i = 0; i < 20; i++) s = stepSoulSpring(s, 1, 1)
    expect(s.value).toBeGreaterThan(0.9); expect(s.value).toBeLessThanOrEqual(1.08)
    s = stepSoulSpring(s, 0, 1 / 60); expect(s.value).toBeLessThanOrEqual(1.08)
  })
  it("converges after release and clamps large deltas", () => {
    let s = { value: 1, velocity: 0 }
    for (let i = 0; i < 240; i++) s = stepSoulSpring(s, 0, 1 / 60)
    expect(Math.abs(s.value)).toBeLessThan(0.002); expect(Math.abs(s.velocity)).toBeLessThan(0.002)
    expect(stepSoulSpring({ value: 0, velocity: 100 }, 0, 10).value).toBeGreaterThanOrEqual(-0.08)
  })
})
