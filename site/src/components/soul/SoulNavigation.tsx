import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import type { PortfolioView, SoulNavigationRect, SoulNavigationView } from "../three/scene-types"

export type SoulNavigationProps = {
  interactive: boolean
  busy: boolean
  sceneMode: "loading" | "webgl" | "fallback"
  activeView: PortfolioView
  onOpen(view: SoulNavigationView): void
  onRectsChange(rects: readonly SoulNavigationRect[]): void
}

const DESTINATIONS: readonly { view: SoulNavigationView; label: string }[] = [
  { view: "about", label: "ABOUT" },
  { view: "work", label: "WORK" },
  { view: "resume", label: "RESUME" },
]

function equalRects(left: readonly SoulNavigationRect[], right: readonly SoulNavigationRect[]) {
  return left.length === right.length && left.every((rect, index) => {
    const candidate = right[index]
    return candidate !== undefined
      && rect.view === candidate.view
      && rect.left === candidate.left
      && rect.top === candidate.top
      && rect.width === candidate.width
      && rect.height === candidate.height
  })
}

export function SoulNavigation({ interactive, busy, sceneMode, activeView, onOpen, onRectsChange }: SoulNavigationProps) {
  const buttons = useRef(new Map<SoulNavigationView, HTMLButtonElement>())
  const previousRects = useRef<readonly SoulNavigationRect[]>([])

  const reportRects = useCallback(() => {
    const rects = DESTINATIONS.flatMap(({ view }) => {
      const rect = buttons.current.get(view)?.getBoundingClientRect()
      return rect ? [{ view, left: rect.left, top: rect.top, width: rect.width, height: rect.height }] : []
    })
    if (rects.length !== DESTINATIONS.length || equalRects(previousRects.current, rects)) return
    previousRects.current = rects
    onRectsChange(rects)
  }, [onRectsChange])

  useLayoutEffect(reportRects, [reportRects, interactive, activeView])

  useEffect(() => {
    const observers = DESTINATIONS.flatMap(({ view }) => {
      const button = buttons.current.get(view)
      if (!button) return []
      const observer = new ResizeObserver(reportRects)
      observer.observe(button)
      return [observer]
    })
    window.addEventListener("resize", reportRects)
    return () => {
      observers.forEach((observer) => observer.disconnect())
      window.removeEventListener("resize", reportRects)
    }
  }, [reportRects])

  const enabled = interactive && !busy && activeView === null

  return (
    <nav
      aria-label="Soul navigation"
      aria-hidden={!enabled}
      {...({ inert: !enabled ? "" : undefined } as Record<string, unknown>)}
      data-scene-mode={sceneMode}
      className={`soul-navigation ${enabled ? "is-interactive" : ""}`}
    >
      {DESTINATIONS.map(({ view, label }) => (
        <button
          key={view}
          ref={(element) => {
            if (element) buttons.current.set(view, element)
            else buttons.current.delete(view)
          }}
          type="button"
          tabIndex={enabled ? 0 : -1}
          aria-pressed={activeView === view}
          disabled={!enabled}
          onClick={() => onOpen(view)}
          className="soul-navigation__button"
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
