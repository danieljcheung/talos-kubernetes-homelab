import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { createSoulMaterial, createSoulMessageTexture } from "./orb-material"
import { stepSoulSpring, type SoulSpring } from "./soul-physics"
import type { SoulSceneState } from "./scene-types"

export function SoulOrb({ state }: { state: SoulSceneState }) {
  const { invalidate } = useThree()
  const geometry = useMemo(() => new THREE.SphereGeometry(1.35, 96, 64), [])
  const core = useMemo(() => createSoulMaterial("core"), [])
  const halo = useMemo(() => createSoulMaterial("halo"), [])
  const materials = useMemo(() => [core, halo], [core, halo])
  const textureRef = useRef<{ from: THREE.Texture; to: THREE.Texture } | null>(null)
  const spring = useRef<SoulSpring>({ value: 0, velocity: 0 })
  useEffect(() => {
    const previous = textureRef.current
    const next = createSoulMessageTexture(state.message)
    const from = previous?.to ?? createSoulMessageTexture(null)
    textureRef.current = { from, to: next }
    for (const material of materials) {
      material.uniforms.uMessageFrom.value = from
      material.uniforms.uMessageTo.value = next
    }
    if (previous) previous.from.dispose()
  }, [materials, state.message])
  useEffect(() => () => {
    const active = textureRef.current
    active?.from.dispose()
    active?.to.dispose()
    geometry.dispose()
    core.dispose()
    halo.dispose()
  }, [core, geometry, halo])
  useFrame((_, delta) => {
    const input = state.press.get()
    spring.current = state.reducedMotion ? { value: input.pressed ? 1 : 0, velocity: 0 } : stepSoulSpring(spring.current, input.pressed ? 1 : 0, delta)
    const time = performance.now() / 1000
    const progress = state.messageProgress.get()
    for (const material of [core, halo]) {
      material.uniforms.uTime.value = time
      material.uniforms.uPress.value = spring.current.value
      material.uniforms.uPressPoint.value.set(input.localX, input.localY)
      material.uniforms.uMessageProgress.value = progress
      material.uniforms.uReducedMotion.value = state.reducedMotion ? 1 : 0
      material.uniforms.uEssenceProgress.value = state.essenceProgress.get()
      material.uniforms.uContentProgress.value = state.contentProgress.get()
    }
    if (Math.abs(spring.current.value) > 0.002 || Math.abs(spring.current.velocity) > 0.002 || (!state.reducedMotion && state.introStage === "settled") || progress < 1 || state.essenceProgress.get() < 1 || state.chatState === "Thinking") invalidate()
  })
  return <group><mesh geometry={geometry} material={core} frustumCulled={false} /><mesh geometry={geometry} material={halo} scale={1.18} frustumCulled={false} /></group>
}
