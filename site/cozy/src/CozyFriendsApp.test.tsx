import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import CozyFriendsApp from './CozyFriendsApp'
import {
  COMMUNITY_LINE,
  HERO_BODY,
  HERO_EYEBROW,
  HERO_HEADING,
  INVITE_NOTE,
  LAUNCHER_GUIDES,
  RESOURCE_LINKS,
  SERVER_ADDRESS,
  USERNAME_REQUEST_FAILURE,
  USERNAME_REQUEST_LABEL,
  USERNAME_REQUEST_PLACEHOLDER,
  USERNAME_REQUEST_SUCCESS,
  USERNAME_REQUEST_VALIDATION,
  VERSION_LINE
} from './content'

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch')

function setFetch(fetchImplementation: typeof fetch) {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: fetchImplementation
  })
}

function setClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText }
  })
}

afterEach(() => {
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
  if (fetchDescriptor) {
    Object.defineProperty(globalThis, 'fetch', fetchDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'fetch')
  }
})

describe('Cozy Friends field guide', () => {
  test('renders the exact server metadata, guide copy, and primary links', () => {
    render(<CozyFriendsApp />)

    expect(screen.getByRole('heading', { name: HERO_HEADING })).toBeInTheDocument()
    expect(screen.getByText(HERO_EYEBROW)).toBeInTheDocument()
    expect(screen.getByText(HERO_BODY)).toBeInTheDocument()
    expect(screen.getByText(VERSION_LINE)).toBeInTheDocument()
    expect(screen.getAllByText(SERVER_ADDRESS)).toHaveLength(2)
    expect(screen.getByText(INVITE_NOTE)).toBeInTheDocument()
    expect(screen.getByText(COMMUNITY_LINE)).toBeInTheDocument()

    for (const guide of LAUNCHER_GUIDES) {
      expect(screen.getByRole('heading', { name: guide.name })).toBeInTheDocument()
      expect(screen.getByText(new RegExp(guide.instructions.slice(0, 30)))).toBeInTheDocument()
    }

    expect(screen.getByText(/FTB Quests 2001\.4\.13/)).toBeInTheDocument()
    for (const resource of RESOURCE_LINKS) {
      const link = screen.getByRole('link', { name: resource.label })
      expect(link).toHaveAttribute('href', resource.href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  test('copies the address and exposes the Copied state', async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined)
    setClipboard(writeText)
    render(<CozyFriendsApp />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy server address' }))
    })

    expect(writeText).toHaveBeenCalledWith(SERVER_ADDRESS)
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  test('shows the exact failure feedback when clipboard writing fails', async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>().mockRejectedValue(new Error('denied'))
    setClipboard(writeText)
    render(<CozyFriendsApp />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy server address' }))
    })

    expect(screen.getByRole('button', { name: 'Copy failed. Select the address manually.' })).toBeInTheDocument()
  })

  test('shows the exact username label, help copy, and placeholder', () => {
    render(<CozyFriendsApp />)

    expect(screen.getByLabelText(USERNAME_REQUEST_LABEL)).toBeInTheDocument()
    expect(screen.getByText(USERNAME_REQUEST_VALIDATION)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(USERNAME_REQUEST_PLACEHOLDER)).toBeInTheDocument()
  })

  test('posts a valid username as JSON and shows success feedback', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 201, headers: { 'Content-Type': 'application/json' } })
    )
    setFetch(fetchMock)
    render(<CozyFriendsApp />)

    fireEvent.change(screen.getByLabelText(USERNAME_REQUEST_LABEL), {
      target: { value: 'CozyDan_' }
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request an allowlist spot' }))
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/usernames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'CozyDan_' })
    })
    expect(screen.getByRole('status')).toHaveTextContent(USERNAME_REQUEST_SUCCESS)
  })

  test('shows the request failure copy when the API rejects the submission', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('', { status: 503 })
    )
    setFetch(fetchMock)
    render(<CozyFriendsApp />)

    fireEvent.change(screen.getByLabelText(USERNAME_REQUEST_LABEL), {
      target: { value: 'CozyDan_' }
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request an allowlist spot' }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent(USERNAME_REQUEST_FAILURE)
  })

  test('shows network failure feedback when the request cannot reach the API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('Network unavailable'))
    setFetch(fetchMock)
    render(<CozyFriendsApp />)

    fireEvent.change(screen.getByLabelText(USERNAME_REQUEST_LABEL), {
      target: { value: 'CozyDan_' }
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request an allowlist spot' }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable')
  })
})
