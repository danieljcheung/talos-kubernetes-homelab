import { useCallback, useEffect, useRef, useState } from "react"
import { useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react"
import { SoulContent } from "./components/portfolio/SoulContent"
import { SoulNavigation } from "./components/soul/SoulNavigation"
import { SoulOrbControl } from "./components/soul/SoulOrbControl"
import { SceneCanvas } from "./components/three/SceneCanvas"
import { SoulScene } from "./components/three/SoulScene"
import type {
  ConnectionState,
  PortfolioView,
  SoulNavigationRect,
  SoulNavigationView,
  SoulPressInput,
  SoulRect,
  SoulSceneState,
} from "./components/three/scene-types"
import { useSceneQuality } from "./hooks/useSceneQuality"
import { useSoulIntro } from "./hooks/useSoulIntro"
import { useSoulTransition } from "./hooks/useSoulTransition"

type SceneMode = "loading" | "webgl" | "fallback"

export default function App() {
  const reducedMotion = useReducedMotion() ?? false
  const intro = useSoulIntro(reducedMotion)
  const [requestedView, setRequestedView] = useState<PortfolioView>(null)
  const [chatState, setChatState] = useState<ConnectionState>("Ready")
  const [sceneMode, setSceneMode] = useState<SceneMode>("loading")
  const [essenceAnimating, setEssenceAnimating] = useState(false)
  const transition = useSoulTransition(requestedView)
  const { quality, reportFrame } = useSceneQuality()
  const soulRect = useMotionValue<SoulRect>({ centerX: 0, centerY: 0, diameter: 0 })
  const navigationRects = useMotionValue<readonly SoulNavigationRect[]>([])
  const press = useMotionValue<SoulPressInput>({ localX: 0, localY: 0, pressed: false })
  const invokingControl = useRef<HTMLElement | null>(null)
  const essenceAnimatingRef = useRef(false)

  useMotionValueEvent(intro.essenceProgress, "change", (value) => {
    const animating = value > 0 && value < 1
    if (essenceAnimatingRef.current === animating) return
    essenceAnimatingRef.current = animating
    setEssenceAnimating(animating)
  })

  const open = useCallback((view: SoulNavigationView | "chat") => {
    if (transition.busy || requestedView !== null) return
    invokingControl.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setRequestedView(view)
  }, [requestedView, transition.busy])

  const close = useCallback(() => setRequestedView(null), [])
  const updateSoulRect = useCallback((rect: SoulRect) => soulRect.set(rect), [soulRect])
  const updatePress = useCallback((input: SoulPressInput) => press.set(input), [press])
  const updateNavigationRects = useCallback((rects: readonly SoulNavigationRect[]) => navigationRects.set(rects), [navigationRects])

  useEffect(() => {
    if (transition.renderedView !== null || transition.busy) return
    const target = invokingControl.current
    invokingControl.current = null
    requestAnimationFrame(() => target?.focus())
  }, [transition.renderedView, transition.busy])

  useEffect(() => {
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
    }
  }, [])

  const onSoulActivate = useCallback(() => {
    if (transition.renderedView !== null || requestedView !== null) {
      close()
      return
    }
    if (intro.stage !== "settled") {
      intro.advance()
      return
    }
    open("chat")
  }, [close, intro.advance, intro.stage, open, requestedView, transition.renderedView])

  const phase = intro.stage === "settled" ? transition.phase : "intro"
  const activeView = transition.renderedView
  const navigationInteractive = intro.navigationInteractive && requestedView === null && activeView === null
  const busy = intro.busy || transition.busy || essenceAnimating
  const sceneState: SoulSceneState = {
    view: activeView,
    phase,
    contentProgress: transition.contentProgress,
    introStage: intro.stage,
    message: intro.message,
    messageProgress: intro.messageProgress,
    essenceProgress: intro.essenceProgress,
    soulRect,
    navigationRects,
    press,
    chatState,
    reducedMotion,
    quality,
  }

  return (
    <main
      data-soul-stage={intro.stage}
      data-soul-phase={phase}
      data-soul-view={activeView ?? "home"}
      aria-busy={busy}
      className="soul-app"
    >
      <div className="soul-ambient" aria-hidden="true" />
      <SceneCanvas
        state={sceneState}
        className={`soul-canvas ${sceneMode === "webgl" ? "is-visible" : ""}`}
        fallback={null}
        onFirstFrame={() => setSceneMode((current) => current === "fallback" ? current : "webgl")}
        onPermanentFallback={() => setSceneMode("fallback")}
        onFrame={reportFrame}
      >
        <SoulScene state={sceneState} />
      </SceneCanvas>
      <SoulOrbControl
        stage={intro.stage}
        visibleMessage={intro.message}
        announcement={intro.announcement}
        activeView={activeView}
        transitionBusy={transition.busy}
        sceneMode={sceneMode}
        onActivate={onSoulActivate}
        onClose={close}
        onSoulRectChange={updateSoulRect}
        onPressInput={updatePress}
      />
      <SoulNavigation
        interactive={navigationInteractive}
        busy={busy || requestedView !== null}
        sceneMode={sceneMode}
        activeView={activeView}
        onOpen={open}
        onRectsChange={updateNavigationRects}
      />
      {activeView && (
        <SoulContent
          view={activeView}
          onClose={close}
          interactive={transition.contentInteractive}
          onChatStateChange={setChatState}
        />
      )}
    </main>
  )
}
