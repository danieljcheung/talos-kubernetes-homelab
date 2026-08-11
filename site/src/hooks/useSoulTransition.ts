import { useEffect, useRef, useState } from "react"
import { animate, motionValue, useMotionValueEvent, useReducedMotion, type MotionValue } from "motion/react"
import type { PortfolioView, SoulContentPhase } from "../components/three/scene-types"

export type SoulTransitionState = {
  phase: SoulContentPhase
  contentProgress: MotionValue<number>
  renderedView: PortfolioView
  busy: boolean
  opening: boolean
  contentInteractive: boolean
}

type StoppableAnimation = { stop(): void }

const EASE = [0.22, 1, 0.36, 1] as const

export function useSoulTransition(requestedView: PortfolioView): SoulTransitionState {
  const reducedMotion = useReducedMotion() ?? false
  const contentProgress = useRef(motionValue(0)).current
  const [phase, setPhase] = useState<SoulContentPhase>("home")
  const [renderedView, setRenderedView] = useState<PortfolioView>(null)
  const [contentInteractive, setContentInteractive] = useState(false)
  const animation = useRef<StoppableAnimation | null>(null)
  const busy = phase === "opening-content" || phase === "closing-content"
  const opening = phase === "opening-content"

  useMotionValueEvent(contentProgress, "change", (value) => {
    if (phase === "opening-content") setContentInteractive(value >= 0.72)
    else if (phase !== "content") setContentInteractive(false)
  })

  useEffect(() => {
    if (requestedView === null) {
      if (renderedView === null || phase === "closing-content") return
      animation.current?.stop()
      setPhase("closing-content")
      setContentInteractive(false)
      if (reducedMotion) {
        contentProgress.set(0)
        setRenderedView(null)
        setPhase("home")
      } else {
        animation.current = animate(contentProgress, 0, {
          duration: 0.52,
          ease: EASE,
          onComplete: () => {
            setRenderedView(null)
            setPhase("home")
          },
        })
      }
      return
    }

    if (busy || renderedView !== null) return
    setRenderedView(requestedView)
    animation.current?.stop()
    if (reducedMotion) {
      contentProgress.set(1)
      setPhase("content")
      setContentInteractive(true)
      return
    }
    setPhase("opening-content")
    setContentInteractive(false)
    animation.current = animate(contentProgress, 1, {
      duration: 0.68,
      ease: EASE,
      onComplete: () => {
        setPhase("content")
        setContentInteractive(true)
      },
    })
  }, [requestedView, reducedMotion, busy, renderedView, phase, contentProgress])

  useEffect(() => () => animation.current?.stop(), [])

  return { phase, contentProgress, renderedView, busy, opening, contentInteractive }
}
