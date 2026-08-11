import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, act } from "@testing-library/react"
import type { ReactNode } from "react"

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react")
  return { ...actual, useReducedMotion: () => true }
})

vi.mock("../components/three/SceneCanvas", () => ({
  SceneCanvas: ({ children, onFirstFrame, onPermanentFallback }: { children: ReactNode; onFirstFrame?: () => void; onPermanentFallback?: () => void }) => (
    <div data-testid="scene-canvas" aria-hidden="true"><button type="button" onClick={onFirstFrame}>first</button><button type="button" onClick={onPermanentFallback}>fallback</button>{children}</div>
  ),
}))
vi.mock("../components/three/SoulScene", () => ({ SoulScene: () => null }))

import App from "../App"

describe("soul app integration", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({ matches: query.includes("prefers-reduced-motion"), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }))
  })
  afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers() })

  test("starts without legacy header, theme, navigation, or content", () => {
    render(<App />)
    expect(screen.queryByRole("banner")).toBeNull()
    expect(screen.queryByRole("navigation")).toBeNull()
    expect(screen.queryByText(/Daniel Cheung/)).toBeNull()
    expect(screen.queryByRole("heading")).toBeNull()
  })

  test("reduced motion accepts three presses in order and exposes nav", () => {
    render(<App />)
    const orb = screen.getByRole("button", { name: "Reveal introduction" })
    act(() => fireEvent.click(orb)); expect(screen.getByText("HI")).toBeInTheDocument()
    act(() => fireEvent.click(screen.getByRole("button", { name: "Continue introduction" }))); expect(screen.getByText("I'M")).toBeInTheDocument()
    act(() => fireEvent.click(screen.getByRole("button", { name: "Continue introduction" })))
    act(() => vi.runAllTimers())
    expect(screen.getByRole("navigation", { name: "Soul navigation" })).toBeInTheDocument()
    expect(screen.getAllByRole("button").map((button) => button.textContent).filter((text) => text && ["ABOUT", "WORK", "RESUME"].includes(text))).toEqual(["ABOUT", "WORK", "RESUME"])
  })

  test("settled orb routes to chat and Escape/Back closes", () => {
    render(<App />)
    const press = () => act(() => fireEvent.click(screen.getByRole("button", { name: /introduction|Continue/ })))
    press(); press(); press(); act(() => vi.runAllTimers())
    act(() => fireEvent.click(screen.getByRole("button", { name: "Talk to Daniel" })))
    act(() => vi.advanceTimersByTime(700))
    expect(screen.getByRole("heading", { name: /chat/i })).toBeInTheDocument()
    act(() => fireEvent.keyDown(document, { key: "Escape" }))
    act(() => vi.advanceTimersByTime(600))
    expect(screen.queryByRole("heading", { name: /chat/i })).toBeNull()
  })

  test("routes destination and exposes busy/inert state", () => {
    render(<App />)
    const advance = () => act(() => fireEvent.click(screen.getByRole("button", { name: /Reveal|Continue/ })))
    advance(); advance(); advance(); act(() => vi.runAllTimers())
    const about = screen.getByRole("button", { name: "ABOUT" })
    expect(about).not.toHaveAttribute("aria-hidden", "true")
    act(() => fireEvent.click(about));
    expect(document.querySelector("main")).toHaveAttribute("data-soul-view", "about")
    act(() => vi.advanceTimersByTime(700))
    expect(screen.getByRole("heading", { name: /about/i })).toBeInTheDocument()
    act(() => fireEvent.click(screen.getByRole("button", { name: "Back to soul" })))
    act(() => vi.advanceTimersByTime(600))
    expect(screen.getByRole("navigation", { name: "Soul navigation" })).toBeInTheDocument()
  })
})
