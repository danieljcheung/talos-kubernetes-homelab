import { Component, Suspense, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import type { SoulSceneState } from "./scene-types"

export type SceneCanvasProps = { state: SoulSceneState; children: ReactNode; fallback: ReactNode; className?: string; interactive?: boolean; onFirstFrame?(): void; onFrame?(milliseconds: number): void; onPermanentFallback?(): void }
type BoundaryProps = { children: ReactNode; fallback: ReactNode; onError?: () => void }
type BoundaryState = { failed: boolean }

class SceneErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }
  static getDerivedStateFromError(): BoundaryState { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo): void { this.props.onError?.() }
  render(): ReactNode { return this.state.failed ? this.props.fallback : this.props.children }
}

function FrameReporter({ onFirstFrame, onFrame, paused, active }: { onFirstFrame?: () => void; onFrame?: (ms: number) => void; paused: boolean; active: boolean }) {
  const first = useRef(false)
  const last = useRef<number | null>(null)
  const { invalidate } = useThree()
  useFrame(({ clock }) => {
    if (paused) return
    const now = clock.getElapsedTime() * 1000
    if (!first.current) { first.current = true; onFirstFrame?.() }
    if (last.current != null) onFrame?.(now - last.current)
    last.current = now
    if (active) invalidate()
  })
  return null
}

export function SceneCanvas({ state, children, fallback, className, interactive = false, onFirstFrame, onFrame, onPermanentFallback }: SceneCanvasProps) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [failed, setFailed] = useState(false)
  const reportedFailure = useRef(false)
  const reportFailure = () => { if (!reportedFailure.current) { reportedFailure.current = true; setFailed(true); onPermanentFallback?.() } }
  useEffect(() => {
    if (!host.current || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const handler = () => setVisible(document.visibilityState !== "hidden")
    document.addEventListener("visibilitychange", handler)
    return () => document.removeEventListener("visibilitychange", handler)
  }, [])
  if (failed) return <div ref={host} className={className} aria-hidden="true">{fallback}</div>
  const dpr = state.quality === "low" ? 1 : state.quality === "medium" ? 1.25 : 1.5
  return <div ref={host} className={className} aria-hidden="true" style={{ pointerEvents: interactive ? "auto" : "none" }}>
    <SceneErrorBoundary fallback={fallback} onError={reportFailure}>
      <Canvas dpr={dpr} frameloop="demand" gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }} camera={{ position: [0, 0, 6], fov: 42 }} onCreated={({ gl }) => {
        if (!gl) reportFailure()
        gl.domElement.addEventListener("webglcontextlost", reportFailure, { once: true })
      }}>
        <Suspense fallback={null}><FrameReporter paused={!visible} active={state.phase === "intro" || state.phase === "opening-content" || state.phase === "closing-content" || state.chatState === "Thinking"} onFirstFrame={onFirstFrame} onFrame={onFrame} />{children}</Suspense>
      </Canvas>
    </SceneErrorBoundary>
  </div>
}
