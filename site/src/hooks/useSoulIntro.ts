import { useCallback, useEffect, useRef, useState } from "react"
import { animate, motionValue, type AnimationPlaybackControls, type MotionValue } from "motion/react"
import { SOUL_MESSAGES } from "../components/three/orb-masks"
import type { SoulIntroStage, SoulMessage } from "../components/three/scene-types"

export type SoulIntroState = {
  stage: SoulIntroStage
  message: SoulMessage | null
  announcement: string
  messageProgress: MotionValue<number>
  essenceProgress: MotionValue<number>
  navigationInteractive: boolean
  busy: boolean
  advance(): void
}

type IntroSnapshot = {
  stage: SoulIntroStage
  message: SoulMessage | null
  announcement: string
}

const MESSAGE_DURATION = 0.42
const MESSAGE_CLEAR_DURATION = 0.36
const DANIEL_HOLD_MS = 1200
const ESSENCE_DURATION = 1.6

export function useSoulIntro(reducedMotion: boolean): SoulIntroState {
  const messageProgress = useRef(motionValue(0)).current
  const essenceProgress = useRef(motionValue(0)).current
  const [snapshot, setSnapshot] = useState<IntroSnapshot>({ stage: "waiting", message: null, announcement: "" })
  const [navigationInteractive, setNavigationInteractive] = useState(false)
  const [busy, setBusy] = useState(false)
  const animation = useRef<AnimationPlaybackControls | null>(null)
  const frame = useRef<number | null>(null)
  const timers = useRef<number[]>([])
  const mounted = useRef(true)
  const stageRef = useRef<SoulIntroStage>("waiting")
  const busyRef = useRef(false)

  const setBusyState = useCallback((value: boolean) => {
    busyRef.current = value
    setBusy(value)
  }, [])

  const stopAnimation = useCallback(() => {
    animation.current?.stop()
    animation.current = null
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
  }, [])

  const startEssence = useCallback(() => {
    if (!mounted.current) return
    stageRef.current = "settled"
    setSnapshot((current) => ({ ...current, stage: "settled" }))
    essenceProgress.set(0)
    setBusyState(false)
    animation.current = animate(essenceProgress, 1, {
      duration: ESSENCE_DURATION,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => {
        if (value >= 0.86) setNavigationInteractive(true)
      },
      onComplete: () => {
        animation.current = null
        setNavigationInteractive(true)
      },
    })
  }, [essenceProgress, setBusyState])

  const clearDanielMessage = useCallback(() => {
    if (!mounted.current) return
    setSnapshot((current) => ({ ...current, message: null }))
    messageProgress.set(0)
    animation.current = animate(messageProgress, 1, {
      duration: MESSAGE_CLEAR_DURATION,
      ease: [0.22, 1, 0.36, 1],
      onComplete: startEssence,
    })
  }, [messageProgress, startEssence])

  const holdDaniel = useCallback(() => {
    const timer = window.setTimeout(clearDanielMessage, DANIEL_HOLD_MS)
    timers.current.push(timer)
  }, [clearDanielMessage])

  const settleReduced = useCallback(() => {
    const timer = window.setTimeout(() => {
      if (!mounted.current) return
      stageRef.current = "settled"
      setSnapshot((current) => ({ ...current, stage: "settled", message: null }))
      essenceProgress.set(1)
      setNavigationInteractive(true)
      setBusyState(false)
    }, 0)
    timers.current.push(timer)
  }, [essenceProgress, setBusyState])

  const advance = useCallback(() => {
    const currentStage = stageRef.current
    if (!mounted.current || busyRef.current || currentStage === "daniel" || currentStage === "settled") return

    const index = currentStage === "waiting" ? 0 : currentStage === "hi" ? 1 : 2
    const next = SOUL_MESSAGES[index]
    if (!next) return

    stopAnimation()
    clearTimers()
    if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    stageRef.current = next.id
    setSnapshot({ stage: next.id, message: next, announcement: next.announcement })
    messageProgress.set(0)
    setBusyState(true)

    if (reducedMotion) {
      messageProgress.set(1)
      if (next.id === "daniel") settleReduced()
      else setBusyState(false)
      return
    }

    frame.current = window.requestAnimationFrame(() => {
      frame.current = null
      if (!mounted.current) return
      animation.current = animate(messageProgress, 1, {
        duration: MESSAGE_DURATION,
        ease: [0.22, 1, 0.36, 1],
        onComplete: () => {
          animation.current = null
          if (next.id === "daniel") holdDaniel()
          else setBusyState(false)
        },
      })
    })
  }, [clearTimers, holdDaniel, messageProgress, reducedMotion, setBusyState, settleReduced, stopAnimation])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stopAnimation()
      clearTimers()
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    }
  }, [clearTimers, stopAnimation])

  return {
    ...snapshot,
    messageProgress,
    essenceProgress,
    navigationInteractive,
    busy,
    advance,
  }
}
