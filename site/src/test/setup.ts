import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
;(globalThis as typeof globalThis & { matchMedia?: typeof window.matchMedia }).matchMedia = window.matchMedia
class PointerEventMock extends MouseEvent {
  readonly pointerId: number

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
  }
}

Object.defineProperty(window, 'PointerEvent', {
  writable: true,
  value: PointerEventMock,
})

// Mock ResizeObserver for tests
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock
})

// Mock HTMLCanvasElement.prototype.getContext for JSDOM
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn().mockImplementation((contextId) => {
    if (contextId === '2d') {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
        putImageData: vi.fn(),
        createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
        drawImage: vi.fn(),
      }
    }
    return null
  })
})
