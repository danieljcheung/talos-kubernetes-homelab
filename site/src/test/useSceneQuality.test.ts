import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSceneQuality } from "../hooks/useSceneQuality"

const setViewport = (width: number, dpr = 1, memory?: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width })
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: dpr })
  Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: memory, writable: true })
}

describe("useSceneQuality", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setViewport(1440, 1, 8)
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as WebGL2RenderingContext)
  })
  afterEach(() => { vi.restoreAllMocks() })

  test.each([
    ["low width", 639, 1, 8, "low"],
    ["low dpr", 1440, 3, 8, "low"],
    ["low memory", 1440, 1, 4, "low"],
    ["medium width", 1199, 1, 8, "medium"],
    ["high", 1440, 1, 8, "high"],
  ])("chooses %s tier", (_label, width, dpr, memory, expected) => {
    setViewport(width, dpr, memory)
    const { result } = renderHook(() => useSceneQuality())
    expect(result.current.quality).toBe(expected)
  })

  test("downgrades exactly once after 30 slow frames", () => {
    const { result } = renderHook(() => useSceneQuality())
    act(() => { for (let i = 0; i < 29; i++) result.current.reportFrame(25) })
    expect(result.current.quality).toBe("high")
    act(() => result.current.reportFrame(25))
    expect(result.current.quality).toBe("medium")
    act(() => { for (let i = 0; i < 90; i++) result.current.reportFrame(30) })
    expect(result.current.quality).toBe("medium")
  })

  test("a fast frame resets consecutive slow-frame count", () => {
    const { result } = renderHook(() => useSceneQuality())
    act(() => { for (let i = 0; i < 29; i++) result.current.reportFrame(25); result.current.reportFrame(10); for (let i = 0; i < 29; i++) result.current.reportFrame(25) })
    expect(result.current.quality).toBe("high")
  })
})
