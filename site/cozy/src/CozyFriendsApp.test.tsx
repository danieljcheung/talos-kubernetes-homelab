import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import CozyFriendsApp, { getCountdownSnapshot, type CozyFriendsAppProps } from './CozyFriendsApp'
import {
  COUNTDOWN_LIVE,
  HERO_BODY,
  HERO_HEADING,
  LAUNCH_DATE_ISO,
  LAUNCH_DATE_MS,
  NAME_REQUEST_LABEL,
  NAME_REQUEST_PLACEHOLDER,
  SERVER_ADDRESS,
  TURNSTILE_REQUIRED,
  TURNSTILE_UNAVAILABLE,
  USERNAME_REQUEST_FAILURE,
  USERNAME_REQUEST_LABEL,
  USERNAME_REQUEST_PLACEHOLDER,
  USERNAME_REQUEST_SUCCESS,
  USERNAME_REQUEST_VALIDATION
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

function createTurnstileMock() {
  let callback: ((token: string) => void) | undefined
  let expiredCallback: (() => void) | undefined
  const client = {
    render: vi.fn((_container: HTMLElement, options: {
      callback: (token: string) => void
      'expired-callback'?: () => void
    }) => {
      callback = options.callback
      expiredCallback = options['expired-callback']
      return 'test-widget'
    }),
    reset: vi.fn()
  }
  return {
    client,
    solve(token = 'turnstile-token') {
      callback?.(token)
    },
    expire() {
      expiredCallback?.()
    }
  }
}

function renderWithTurnstile(props: Omit<CozyFriendsAppProps, 'turnstileSiteKey'> = {}) {
  const turnstile = createTurnstileMock()
  render(<CozyFriendsApp turnstileClient={turnstile.client} turnstileSiteKey="test-site-key" {...props} />)
  return turnstile
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
  test('renders the reference field guide with current server details', () => {
    render(<CozyFriendsApp />)

    expect(HERO_HEADING).toBe('A cozy place, built together.')
    expect(HERO_BODY).toBe(
      'A whitelisted Minecraft server for friends. Survive, build, explore, and make memories together.'
    )
    expect(screen.getByRole('heading', { name: HERO_HEADING })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveTextContent('A MINECRAFT SERVER')
    expect(screen.getByText(/A whitelisted Minecraft server for friends\./)).toBeInTheDocument()
    expect(screen.getByText(/Survive, build, explore, and make memories together\./)).toBeInTheDocument()

    const navigation = screen.getByRole('navigation')
    for (const label of ['HOME', 'ABOUT', 'FEATURES', 'GALLERY', 'JOIN']) {
      expect(within(navigation).getByRole('link', { name: label, exact: true })).toBeInTheDocument()
    }
    expect(within(navigation).getByRole('link', { name: 'HOME', exact: true })).toHaveAttribute('aria-current', 'page')

    expect(screen.getByRole('link', { name: 'JOIN COZY FRIENDS' })).toHaveAttribute('href', '#request')
    expect(screen.getAllByText(SERVER_ADDRESS, { exact: true }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Copy server address' })).toBeInTheDocument()
    expect(document.body).toHaveTextContent('August 13, 2026')
    expect(document.body).toHaveTextContent('8:00 PM EDT')

    for (const label of ['DOWNLOAD MOD PACK', 'SEND USERNAME', 'CONNECT TO SERVER']) {
      expect(screen.getByText(label, { exact: true })).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: 'Open CurseForge', exact: true })).toHaveAttribute(
      'href',
      'https://www.curseforge.com/minecraft/modpacks/homestead-cozy/files/8110152'
    )

    const renderedPage = document.body.innerHTML
    expect(renderedPage).not.toMatch(/cozyfriends\.net/i)
    expect(renderedPage).not.toContain('June 15, 2025')
  })

  test('shows the countdown immediately before launch and the live state at the boundary', () => {
    const beforeLaunch = LAUNCH_DATE_MS - ((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000)
    expect(getCountdownSnapshot(beforeLaunch)).toEqual({
      isLive: false,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5
    })
    expect(getCountdownSnapshot(LAUNCH_DATE_MS)).toEqual({
      isLive: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    })
    expect(LAUNCH_DATE_ISO).toBe('2026-08-13T20:00:00-04:00')

    render(<CozyFriendsApp now={() => LAUNCH_DATE_MS} />)
    expect(screen.getByRole('status')).toHaveTextContent(COUNTDOWN_LIVE)
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

  test('shows Name, exact username, and the explicit Turnstile widget', async () => {
    renderWithTurnstile()
    await act(async () => {})

    const nameField = screen.getByRole('textbox', { name: NAME_REQUEST_LABEL })
    const usernameField = screen.getByRole('textbox', { name: USERNAME_REQUEST_LABEL })
    expect(nameField).toHaveAttribute('id', 'requester-name')
    expect(nameField).toHaveAttribute('name', 'name')
    expect(screen.getByPlaceholderText(NAME_REQUEST_PLACEHOLDER)).toBe(nameField)
    expect(usernameField).toHaveAttribute('id', 'minecraft-username')
    expect(usernameField).toHaveAttribute('name', 'username')
    expect(screen.getByText(USERNAME_REQUEST_VALIDATION)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(USERNAME_REQUEST_PLACEHOLDER)).toBe(usernameField)
    expect(screen.getByTestId('turnstile-widget')).toHaveAttribute('data-sitekey', 'test-site-key')
  })

  test('fails closed when Turnstile is not ready', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    setFetch(fetchMock)
    render(<CozyFriendsApp turnstileSiteKey="" />)

    fireEvent.change(screen.getByRole('textbox', { name: NAME_REQUEST_LABEL }), { target: { value: 'Dan' } })
    fireEvent.change(screen.getByRole('textbox', { name: USERNAME_REQUEST_LABEL }), { target: { value: 'CozyDan_' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request an allowlist spot' }))
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(TURNSTILE_UNAVAILABLE)
  })

  test('requires a solved Turnstile challenge before posting', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    setFetch(fetchMock)
    const turnstile = renderWithTurnstile()
    await act(async () => {})

    fireEvent.change(screen.getByRole('textbox', { name: NAME_REQUEST_LABEL }), { target: { value: 'Dan' } })
    fireEvent.change(screen.getByRole('textbox', { name: USERNAME_REQUEST_LABEL }), { target: { value: 'CozyDan_' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request an allowlist spot' }))
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(TURNSTILE_REQUIRED)
    await act(async () => {
      turnstile.expire()
    })
  })

  test('posts name, username, and Turnstile token as JSON and shows success feedback', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 201, headers: { 'Content-Type': 'application/json' } })
    )
    setFetch(fetchMock)
    const turnstile = renderWithTurnstile()
    await act(async () => {})
    await act(async () => {
      turnstile.solve('test-turnstile-token')
    })

    fireEvent.change(screen.getByRole('textbox', { name: NAME_REQUEST_LABEL }), { target: { value: ' Dan ' } })
    fireEvent.change(screen.getByRole('textbox', { name: USERNAME_REQUEST_LABEL }), { target: { value: 'CozyDan_' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request an allowlist spot' }))
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/usernames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dan', username: 'CozyDan_', turnstileToken: 'test-turnstile-token' })
    })
    expect(screen.getByRole('status')).toHaveTextContent(USERNAME_REQUEST_SUCCESS)
  })

  test('shows the request failure copy when the API rejects the submission', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('', { status: 503 })
    )
    setFetch(fetchMock)
    const turnstile = renderWithTurnstile()
    await act(async () => {})
    await act(async () => {
      turnstile.solve()
    })

    fireEvent.change(screen.getByRole('textbox', { name: NAME_REQUEST_LABEL }), { target: { value: 'Dan' } })
    fireEvent.change(screen.getByRole('textbox', { name: USERNAME_REQUEST_LABEL }), { target: { value: 'CozyDan_' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request an allowlist spot' }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent(USERNAME_REQUEST_FAILURE)
  })

  test('shows network failure feedback when the request cannot reach the API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('Network unavailable'))
    setFetch(fetchMock)
    const turnstile = renderWithTurnstile()
    await act(async () => {})
    await act(async () => {
      turnstile.solve()
    })

    fireEvent.change(screen.getByRole('textbox', { name: NAME_REQUEST_LABEL }), { target: { value: 'Dan' } })
    fireEvent.change(screen.getByRole('textbox', { name: USERNAME_REQUEST_LABEL }), { target: { value: 'CozyDan_' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Request an allowlist spot' }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Network unavailable')
  })
})
