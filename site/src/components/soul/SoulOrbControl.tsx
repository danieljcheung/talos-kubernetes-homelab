import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { PortfolioView, SoulIntroStage, SoulMessage, SoulPressInput, SoulRect } from "../three/scene-types"

export type SoulOrbControlProps = {
  stage: SoulIntroStage
  visibleMessage: SoulMessage | null
  announcement: string
  activeView: PortfolioView
  transitionBusy: boolean
  sceneMode: "loading" | "webgl" | "fallback"
  onActivate(): void
  onClose(): void
  onSoulRectChange(rect: SoulRect): void
  onPressInput(input: SoulPressInput): void
}

type Point = { x: number; y: number }

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

export function SoulOrbControl({
  stage,
  visibleMessage,
  announcement,
  activeView,
  transitionBusy,
  sceneMode,
  onActivate,
  onClose,
  onSoulRectChange,
  onPressInput,
}: SoulOrbControlProps) {
  const positionRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pointerId = useRef<number | null>(null)
  const pointerStart = useRef<Point>({ x: 0, y: 0 })
  const dragged = useRef(false)
  const heldKey = useRef<string | null>(null)
  const suppressClick = useRef(false)
  const measurementFrame = useRef<number | null>(null)
  const runningTransitions = useRef(0)
  const [pressed, setPressed] = useState(false)

  const reportRect = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    onSoulRectChange({
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      diameter: Math.max(rect.width, rect.height),
    })
  }, [onSoulRectChange])

  const reportAt = useCallback((clientX: number, clientY: number, isPressed: boolean) => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const halfWidth = Math.max(1, rect.width / 2)
    const halfHeight = Math.max(1, rect.height / 2)
    onPressInput({
      localX: clamp((clientX - (rect.left + rect.width / 2)) / halfWidth),
      localY: clamp(((rect.top + rect.height / 2) - clientY) / halfHeight),
      pressed: isPressed,
    })
  }, [onPressInput])

  const releasePointer = useCallback((event: React.PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    if (pointerId.current !== event.pointerId) return
    reportAt(event.clientX, event.clientY, false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
    pointerId.current = null
    setPressed(false)
    if (cancelled) dragged.current = false
  }, [reportAt])

  useLayoutEffect(() => {
    reportRect()
  }, [stage, activeView, transitionBusy, reportRect])

  useEffect(() => {
    const button = buttonRef.current
    const position = positionRef.current
    if (!button || !position) return
    const resizeObserver = new ResizeObserver(reportRect)
    resizeObserver.observe(button)
    const measureLoop = () => {
      reportRect()
      if (runningTransitions.current > 0) measurementFrame.current = requestAnimationFrame(measureLoop)
      else measurementFrame.current = null
    }
    const onTransitionRun = () => {
      runningTransitions.current += 1
      if (measurementFrame.current === null) measurementFrame.current = requestAnimationFrame(measureLoop)
    }
    const onTransitionDone = () => {
      runningTransitions.current = Math.max(0, runningTransitions.current - 1)
      reportRect()
    }
    position.addEventListener("transitionrun", onTransitionRun)
    position.addEventListener("transitionend", onTransitionDone)
    position.addEventListener("transitioncancel", onTransitionDone)
    window.addEventListener("resize", reportRect)
    return () => {
      resizeObserver.disconnect()
      position.removeEventListener("transitionrun", onTransitionRun)
      position.removeEventListener("transitionend", onTransitionDone)
      position.removeEventListener("transitioncancel", onTransitionDone)
      window.removeEventListener("resize", reportRect)
      if (measurementFrame.current !== null) cancelAnimationFrame(measurementFrame.current)
    }
  }, [reportRect])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeView) onClose()
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [activeView, onClose])

  const contentActive = activeView !== null
  const label = contentActive
    ? "Return to soul navigation"
    : stage === "waiting"
      ? "Reveal introduction"
      : stage === "hi" || stage === "im"
        ? "Continue introduction"
        : stage === "daniel"
          ? "Introduction completing"
          : "Talk to Daniel"

  return (
    <div ref={positionRef} className={`soul-orb-position ${contentActive ? "soul-orb-position--content" : stage === "settled" ? "soul-orb-position--home" : ""}`}>
      <span className="sr-only">Press the soul to continue the introduction.</span>
      <span aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</span>
      <button
        ref={buttonRef}
        type="button"
        data-soul-trigger="true"
        aria-label={label}
        aria-controls={contentActive ? "soul-content" : undefined}
        className={`soul-orb-trigger ${pressed ? "is-pressed" : ""}`}
        onPointerDown={(event) => {
          pointerId.current = event.pointerId
          pointerStart.current = { x: event.clientX, y: event.clientY }
          dragged.current = false
          setPressed(true)
          event.currentTarget.setPointerCapture?.(event.pointerId)
          reportAt(event.clientX, event.clientY, true)
        }}
        onPointerMove={(event) => {
          if (pointerId.current !== event.pointerId) return
          const distance = Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y)
          if (distance > 5) dragged.current = true
          reportAt(event.clientX, event.clientY, true)
        }}
        onPointerUp={(event) => releasePointer(event, false)}
        onPointerCancel={(event) => releasePointer(event, true)}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          if (dragged.current) {
            dragged.current = false
            return
          }
          onActivate()
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          if (event.repeat || heldKey.current) return
          heldKey.current = event.key
          setPressed(true)
          onPressInput({ localX: 0, localY: 0, pressed: true })
        }}
        onKeyUp={(event) => {
          if (event.key !== heldKey.current) return
          event.preventDefault()
          heldKey.current = null
          suppressClick.current = true
          setPressed(false)
          onPressInput({ localX: 0, localY: 0, pressed: false })
          onActivate()
        }}
        onBlur={() => {
          if (!heldKey.current) return
          heldKey.current = null
          setPressed(false)
          onPressInput({ localX: 0, localY: 0, pressed: false })
        }}
      >
        {sceneMode !== "webgl" && (
          <span className="soul-orb-fallback" aria-hidden="true">
            <span className="soul-orb-fallback__message">{visibleMessage?.visual ?? ""}</span>
          </span>
        )}
      </button>
    </div>
  )
}
