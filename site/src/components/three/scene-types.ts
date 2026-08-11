import type { MotionValue } from "motion/react"

export type SoulNavigationView = "about" | "work" | "resume"
export type PortfolioView = SoulNavigationView | "chat" | null
export type SoulIntroStage = "waiting" | "hi" | "im" | "daniel" | "settled"
export type SoulMessage = {
  id: "hi" | "im" | "daniel"
  visual: string
  announcement: string
  width: number
  height: number
}
export type SoulPhase = "intro" | "home" | "opening-content" | "content" | "closing-content"
export type SoulContentPhase = Exclude<SoulPhase, "intro">
export type ConnectionState = "Ready" | "Thinking" | "Rate limited" | "Offline"

export type SoulRect = {
  centerX: number
  centerY: number
  diameter: number
}

export type SoulPressInput = {
  localX: number
  localY: number
  pressed: boolean
}

export type SoulNavigationRect = {
  view: SoulNavigationView
  left: number
  top: number
  width: number
  height: number
}

export type SoulSceneState = {
  view: PortfolioView
  phase: SoulPhase
  contentProgress: MotionValue<number>
  introStage: SoulIntroStage
  message: SoulMessage | null
  messageProgress: MotionValue<number>
  essenceProgress: MotionValue<number>
  soulRect: MotionValue<SoulRect>
  navigationRects: MotionValue<readonly SoulNavigationRect[]>
  press: MotionValue<SoulPressInput>
  chatState: ConnectionState
  reducedMotion: boolean
  quality: "low" | "medium" | "high"
}
