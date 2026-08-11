import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
import { useMotionValueEvent } from "motion/react"
import * as THREE from "three"
import { SoulEssence } from "./SoulEssence"
import { SoulOrb } from "./SoulOrb"
import type { SoulSceneState } from "./scene-types"

export type SoulSceneProps = { state: SoulSceneState }

export function SoulScene({ state }: SoulSceneProps) {
  const group = useRef<THREE.Group>(null)
  const { viewport, invalidate } = useThree()
  const rect = useRef(state.soulRect.get())
  useMotionValueEvent(state.soulRect, "change", (value) => {
    rect.current = value
    invalidate()
  })
  useFrame(() => {
    const r = rect.current
    if (!group.current || !r.diameter) return
    const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight)
    group.current.position.set((r.centerX / width - 0.5) * viewport.width, (0.5 - r.centerY / height) * viewport.height, 0)
    group.current.scale.setScalar((r.diameter / height * viewport.height) / 2.7)
  })
  return <><group ref={group}><SoulOrb state={state} /></group><SoulEssence state={state} /></>
}
