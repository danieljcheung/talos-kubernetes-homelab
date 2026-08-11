import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react")
  return {
    ...actual,
    animate: (value: { set(next: number): void }, target: number, options: { duration?: number; onUpdate?(value: number): void; onComplete?(): void }) => {
      let stopped = false
      const timer = window.setTimeout(() => {
        if (stopped) return
        value.set(target)
        options.onUpdate?.(target)
        options.onComplete?.()
      }, (options.duration ?? 0) * 1000)
      return { stop: () => { stopped = true; window.clearTimeout(timer) } }
    },
  }
})

import { useSoulIntro } from "../hooks/useSoulIntro"

const tick = (milliseconds: number) => act(() => vi.advanceTimersByTime(milliseconds))
const pressAndFinishFlip = (advance: () => void) => {
  act(advance)
  tick(0)
  tick(420)
}

describe("useSoulIntro", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => window.setTimeout(() => callback(0), 0))
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => window.clearTimeout(id))
  })

  afterEach(() => {
    act(() => vi.runOnlyPendingTimers())
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test("accepts exactly the ordered Hi, I’m, Daniel presses and rejects a press while flipping", () => {
    const { result } = renderHook(() => useSoulIntro(false))

    act(() => result.current.advance())
    expect(result.current.stage).toBe("hi")
    expect(result.current.message?.announcement).toBe("Hi")
    act(() => result.current.advance())
    expect(result.current.stage).toBe("hi")
    tick(0)
    tick(420)

    pressAndFinishFlip(() => result.current.advance())
    expect(result.current.stage).toBe("im")
    expect(result.current.message?.announcement).toBe("I’m")

    pressAndFinishFlip(() => result.current.advance())
    expect(result.current.stage).toBe("daniel")
    expect(result.current.message?.announcement).toBe("Daniel")
  })

  test("holds Daniel, clears the mask, and exposes navigation during essence completion", () => {
    const { result } = renderHook(() => useSoulIntro(false))
    pressAndFinishFlip(() => result.current.advance())
    pressAndFinishFlip(() => result.current.advance())
    pressAndFinishFlip(() => result.current.advance())

    tick(1199)
    expect(result.current.stage).toBe("daniel")
    expect(result.current.message?.visual).toBe("DANIEL")
    tick(1)
    expect(result.current.message).toBeNull()
    tick(360)
    expect(result.current.stage).toBe("settled")
    expect(result.current.navigationInteractive).toBe(false)
    tick(1600)
    expect(result.current.essenceProgress.get()).toBe(1)
    expect(result.current.navigationInteractive).toBe(true)
  })

  test("preserves three reduced-motion presses before settling on a zero-delay timer", () => {
    const { result } = renderHook(() => useSoulIntro(true))
    act(() => result.current.advance())
    expect(result.current.stage).toBe("hi")
    act(() => result.current.advance())
    expect(result.current.stage).toBe("im")
    act(() => result.current.advance())
    expect(result.current.stage).toBe("daniel")
    expect(result.current.message?.announcement).toBe("Daniel")
    expect(result.current.messageProgress.get()).toBe(1)
    tick(0)
    expect(result.current.stage).toBe("settled")
    expect(result.current.essenceProgress.get()).toBe(1)
    expect(result.current.navigationInteractive).toBe(true)
  })

  test("cancels frames, timers, and animations on unmount", () => {
    const { result, unmount } = renderHook(() => useSoulIntro(false))
    act(() => result.current.advance())
    unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
    tick(10000)
  })
})
