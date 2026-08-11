import { useCallback, useRef, useState } from "react"

export type SceneQuality = "low" | "medium" | "high"
export type SceneQualityState = { quality: SceneQuality; reportFrame(milliseconds: number): void }

function initialQuality(): SceneQuality {
  if (typeof window === "undefined") return "medium"
  const width = window.innerWidth
  const dpr = window.devicePixelRatio || 1
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  let webgl = true
  try {
    const canvas = document.createElement("canvas")
    webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch { webgl = false }
  if (!webgl || width < 640 || dpr > 2 || (memory !== undefined && memory <= 4)) return "low"
  if (width < 1200) return "medium"
  return "high"
}

export function useSceneQuality(): SceneQualityState {
  const initial = useRef<SceneQuality | null>(null)
  if (initial.current === null) initial.current = initialQuality()
  const [quality, setQuality] = useState<SceneQuality>(initial.current)
  const slowFrames = useRef(0)
  const downgraded = useRef(false)

  const reportFrame = useCallback((milliseconds: number) => {
    if (downgraded.current) return
    if (milliseconds > 24) slowFrames.current += 1
    else slowFrames.current = 0
    if (slowFrames.current >= 30) {
      downgraded.current = true
      setQuality((current) => current === "high" ? "medium" : current === "medium" ? "low" : "low")
    }
  }, [])
  return { quality, reportFrame }
}
