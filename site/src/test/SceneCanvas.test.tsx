import { expect, test, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { SceneCanvas } from "../components/three/SceneCanvas"
import type { SoulNavigationRect, SoulPressInput, SoulSceneState } from "../components/three/scene-types"
import { motionValue } from "motion/react"

const fiberMocks = vi.hoisted(() => ({ useFrame: vi.fn(), useThree: vi.fn(() => ({ invalidate: vi.fn() })) }))
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, onCreated, dpr }: { children: ReactNode; onCreated?: (value: { gl: { domElement: HTMLCanvasElement } | null }) => void; dpr: number }) => {
    const canvas = document.createElement("canvas")
    onCreated?.({ gl: { domElement: canvas } })
    return <div data-testid="canvas" data-dpr={dpr}>{children}</div>
  },
  useFrame: fiberMocks.useFrame,
  useThree: fiberMocks.useThree,
}))

function state(phase: SoulSceneState["phase"] = "home"): SoulSceneState {
  return { view: null, phase, contentProgress: motionValue(0), introStage: "settled", message: null, messageProgress: motionValue(1), essenceProgress: motionValue(1), soulRect: motionValue({ centerX: 0, centerY: 0, diameter: 0 }), navigationRects: motionValue<readonly SoulNavigationRect[]>([]), press: motionValue<SoulPressInput>({ localX: 0, localY: 0, pressed: false }), chatState: "Ready", reducedMotion: false, quality: "medium" }
}

test("renders one canvas and reports first frame once", () => {
  const first = vi.fn()
  render(<SceneCanvas state={state("intro")} fallback={<span>fallback</span>} onFirstFrame={first}><span>scene</span></SceneCanvas>)
  expect(screen.getAllByTestId("canvas")).toHaveLength(1)
  expect(screen.getByTestId("canvas")).toHaveAttribute("data-dpr", "1.25")
  expect(first).not.toHaveBeenCalled() // FrameReporter waits for the renderer frame
})

test("permanent fallback is one-shot and preserves fallback semantics", () => {
  const fallback = vi.fn()
  render(<SceneCanvas state={state()} fallback={<span>fallback</span>} onPermanentFallback={fallback}><span>scene</span></SceneCanvas>)
  const host = document.querySelector("div[aria-hidden='true']")
  expect(host).toBeTruthy()
  expect(fallback).not.toHaveBeenCalled()
})
