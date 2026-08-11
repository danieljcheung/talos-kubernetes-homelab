export type SoulSpring = { value: number; velocity: number }

export function stepSoulSpring(state: SoulSpring, target: 0 | 1, deltaSeconds: number): SoulSpring {
  const dt = Math.min(Math.max(deltaSeconds, 0), 1 / 30)
  const acceleration = (target - state.value) * 210 - state.velocity * 16
  let velocity = state.velocity + acceleration * dt
  let value = state.value + velocity * dt
  value = Math.max(-0.08, Math.min(1.08, value))
  if (value === -0.08 || value === 1.08) velocity *= 0.5
  if (Math.abs(target - value) < 0.002 && Math.abs(velocity) < 0.002) { value = target; velocity = 0 }
  return { value, velocity }
}
