import { beforeEach, describe, expect, test, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { SoulOrbControl } from "../components/soul/SoulOrbControl"
import type { SoulOrbControlProps } from "../components/soul/SoulOrbControl"
import type { SoulMessage } from "../components/three/scene-types"

const message: SoulMessage = { id: "hi", visual: "HI", announcement: "Hi", width: 0.44, height: 0.3 }

const renderControl = (overrides: Partial<SoulOrbControlProps> = {}) => {
  const props: SoulOrbControlProps = {
    stage: "waiting",
    visibleMessage: null,
    announcement: "",
    activeView: null,
    transitionBusy: false,
    sceneMode: "fallback",
    onActivate: vi.fn(),
    onClose: vi.fn(),
    onSoulRectChange: vi.fn(),
    onPressInput: vi.fn(),
    ...overrides,
  }
  const result = render(<SoulOrbControl {...props} />)
  const button = screen.getByRole("button")
  Object.defineProperty(button, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ left: 100, top: 200, width: 300, height: 200, right: 400, bottom: 400 }),
  })
  return { ...result, button, props }
}

beforeEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { configurable: true, value: vi.fn(() => true) })
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", { configurable: true, value: vi.fn() })
})

describe("SoulOrbControl", () => {
  test("reports rect and clamps local pointer coordinates, capturing and releasing", () => {
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 100, top: 200, width: 300, height: 200, right: 400, bottom: 400 }),
    })
    const onPressInput = vi.fn()
    const onSoulRectChange = vi.fn()
    const { button } = renderControl({ onPressInput, onSoulRectChange })
    expect(onSoulRectChange).toHaveBeenCalledWith({ centerX: 250, centerY: 300, diameter: 300 })

    fireEvent.pointerDown(button, { pointerId: 3, clientX: -100, clientY: 999 })
    expect(button.setPointerCapture).toHaveBeenCalledWith(3)
    expect(onPressInput).toHaveBeenLastCalledWith({ localX: -1, localY: -1, pressed: true })
    fireEvent.pointerMove(button, { pointerId: 3, clientX: 999, clientY: -100 })
    expect(onPressInput).toHaveBeenLastCalledWith({ localX: 1, localY: 1, pressed: true })
    fireEvent.pointerUp(button, { pointerId: 3, clientX: 250, clientY: 300 })
    expect(button.releasePointerCapture).toHaveBeenCalledWith(3)
    expect(onPressInput).toHaveBeenLastCalledWith({ localX: 0, localY: 0, pressed: false })
  })

  test("activates a click but suppresses activation after a drag beyond five pixels", () => {
    const onActivate = vi.fn()
    const { button } = renderControl({ onActivate })
    fireEvent.pointerDown(button, { pointerId: 1, clientX: 250, clientY: 300 })
    fireEvent.pointerUp(button, { pointerId: 1, clientX: 250, clientY: 300 })
    fireEvent.click(button)
    expect(onActivate).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(button, { pointerId: 2, clientX: 250, clientY: 300 })
    fireEvent.pointerMove(button, { pointerId: 2, clientX: 256, clientY: 300 })
    fireEvent.pointerUp(button, { pointerId: 2, clientX: 256, clientY: 300 })
    fireEvent.click(button)
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  test.each(["Enter", " "]) ("keyboard %s presses and releases exactly once, ignoring repeats", (key) => {
    const onActivate = vi.fn(); const onPressInput = vi.fn()
    const { button } = renderControl({ onActivate, onPressInput })
    fireEvent.keyDown(button, { key, repeat: false })
    fireEvent.keyDown(button, { key, repeat: true })
    fireEvent.keyUp(button, { key })
    fireEvent.keyUp(button, { key })
    expect(onActivate).toHaveBeenCalledTimes(1)
    expect(onPressInput).toHaveBeenNthCalledWith(1, { localX: 0, localY: 0, pressed: true })
    expect(onPressInput).toHaveBeenNthCalledWith(2, { localX: 0, localY: 0, pressed: false })
  })

  test("blur releases a held key without activating and Escape closes active content", () => {
    const onActivate = vi.fn(); const onClose = vi.fn(); const onPressInput = vi.fn()
    const { button } = renderControl({ activeView: "about", onActivate, onClose, onPressInput })
    fireEvent.keyDown(button, { key: "Enter" })
    fireEvent.blur(button)
    expect(onActivate).not.toHaveBeenCalled()
    expect(onPressInput).toHaveBeenLastCalledWith({ localX: 0, localY: 0, pressed: false })
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test("measures every frame while the positioning wrapper transitions", () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    const onSoulRectChange = vi.fn()
    const { button } = renderControl({ onSoulRectChange })
    const callsBeforeTransition = onSoulRectChange.mock.calls.length
    fireEvent.transitionRun(button.parentElement as HTMLElement)
    expect(frames).toHaveLength(1)
    frames.shift()?.(0)
    expect(onSoulRectChange.mock.calls.length).toBeGreaterThan(callsBeforeTransition)
    fireEvent.transitionEnd(button.parentElement as HTMLElement)
    frames.shift()?.(16)
  })

  test("uses required labels and renders the exact fallback message", () => {
    const { button, rerender } = renderControl({ stage: "waiting", visibleMessage: message })
    expect(button).toHaveAccessibleName("Reveal introduction")
    expect(screen.getByText("HI")).toBeInTheDocument()
    rerender(<SoulOrbControl stage="hi" visibleMessage={message} announcement="Hi" activeView={null} transitionBusy={false} sceneMode="fallback" onActivate={vi.fn()} onClose={vi.fn()} onSoulRectChange={vi.fn()} onPressInput={vi.fn()} />)
    expect(screen.getByRole("button")).toHaveAccessibleName("Continue introduction")
  })
})
