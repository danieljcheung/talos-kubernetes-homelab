import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  COMMUNITY_LINE,
  CONNECTION_STEPS,
  COUNTDOWN_BODY,
  COUNTDOWN_EYEBROW,
  COUNTDOWN_HEADING,
  COUNTDOWN_LIVE,
  COUNTDOWN_WAITING,
  HERO_BODY,
  HERO_EYEBROW,
  HERO_HEADING,
  INVITE_NOTE,
  LAUNCH_DATE_MS,
  LAUNCHER_GUIDES,
  NAME_REQUEST_LABEL,
  NAME_REQUEST_PLACEHOLDER,
  NAME_REQUEST_VALIDATION,
  RESOURCE_LINKS,
  SERVER_ADDRESS,
  TROUBLESHOOTING,
  TURNSTILE_LABEL,
  TURNSTILE_REQUIRED,
  TURNSTILE_UNAVAILABLE,
  USERNAME_REQUEST_BODY,
  USERNAME_REQUEST_EYEBROW,
  USERNAME_REQUEST_FAILURE,
  USERNAME_REQUEST_HEADING,
  USERNAME_REQUEST_LABEL,
  USERNAME_REQUEST_PLACEHOLDER,
  USERNAME_REQUEST_SUBMIT,
  USERNAME_REQUEST_SUBMITTING,
  USERNAME_REQUEST_SUCCESS,
  USERNAME_REQUEST_VALIDATION,
  VERSION_LINE
} from './content'
import { loadTurnstile, type TurnstileClient, type TurnstileWidgetId } from './turnstile'

type CopyState = 'idle' | 'copied' | 'failed'

type UsernameSubmissionState = 'idle' | 'submitting' | 'submitted' | 'failed'

type TurnstileWidgetProps = {
  client?: TurnstileClient
  siteKey: string
  onReady: (ready: boolean) => void
  onToken: (token: string) => void
}

function TurnstileWidget({ client: injectedClient, siteKey, onReady, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<TurnstileWidgetId>()
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')

  useEffect(() => {
    let active = true
    let client: TurnstileClient | undefined

    if (!siteKey) {
      setStatus('unavailable')
      onReady(false)
      return () => {
        active = false
      }
    }

    const clientPromise = injectedClient ? Promise.resolve(injectedClient) : loadTurnstile()
    clientPromise.then((resolvedClient) => {
      if (!active || !containerRef.current) {
        return
      }

      client = resolvedClient
      try {
        onReady(true)
        setStatus('ready')
        widgetIdRef.current = resolvedClient.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            if (active) {
              onToken(token)
            }
          },
          'expired-callback': () => {
            if (active) {
              onToken('')
            }
          },
          'error-callback': () => {
            if (active) {
              onToken('')
            }
          }
        })
      } catch {
        if (active) {
          setStatus('unavailable')
          onReady(false)
        }
      }
    }).catch(() => {
      if (active) {
        setStatus('unavailable')
        onReady(false)
      }
    })

    return () => {
      active = false
      if (client?.reset && widgetIdRef.current !== undefined) {
        client.reset(widgetIdRef.current)
      }
      widgetIdRef.current = undefined
    }
  }, [injectedClient, onReady, onToken, siteKey])

  return (
    <div className="turnstile-widget" data-testid="turnstile-widget" data-sitekey={siteKey} role="group" aria-label="Cloudflare Turnstile security check">
      <div ref={containerRef} />
      <p className="turnstile-widget__status" aria-live="polite">
        {status === 'loading' ? 'Loading security check…' : status === 'unavailable' ? TURNSTILE_UNAVAILABLE : ''}
      </p>
    </div>
  )
}

type UsernameRequestFormProps = {
  turnstileClient?: TurnstileClient
  turnstileSiteKey: string
}

function UsernameRequestForm({ turnstileClient, turnstileSiteKey }: UsernameRequestFormProps) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [submissionState, setSubmissionState] = useState<UsernameSubmissionState>('idle')
  const [submissionError, setSubmissionError] = useState('')

  const handleTurnstileReady = useCallback((ready: boolean) => {
    setTurnstileReady(ready)
    if (!ready) {
      setTurnstileToken('')
    }
  }, [])

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])

  const submitUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedUsername = username.trim()
    setSubmissionError('')

    if (trimmedName.length < 1 || trimmedName.length > 80) {
      setSubmissionState('failed')
      setSubmissionError(NAME_REQUEST_VALIDATION)
      return
    }
    if (!/^[A-Za-z0-9_]{3,16}$/.test(trimmedUsername)) {
      setSubmissionState('failed')
      setSubmissionError(USERNAME_REQUEST_VALIDATION)
      return
    }
    if (!turnstileReady) {
      setSubmissionState('failed')
      setSubmissionError(TURNSTILE_UNAVAILABLE)
      return
    }
    if (!turnstileToken) {
      setSubmissionState('failed')
      setSubmissionError(TURNSTILE_REQUIRED)
      return
    }

    setSubmissionState('submitting')

    try {
      const response = await fetch('/api/usernames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          username: trimmedUsername,
          turnstileToken
        })
      })
      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        // The generic failure copy below is enough when the API sends no JSON.
      }
      if (!response.ok) {
        const message = typeof payload === 'object' && payload !== null && 'error' in payload
          ? payload.error
          : null
        throw new Error(typeof message === 'string' ? message : USERNAME_REQUEST_FAILURE)
      }
      setSubmissionState('submitted')
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : USERNAME_REQUEST_FAILURE)
      setSubmissionState('failed')
    }
  }

  if (submissionState === 'submitted') {
    return (
      <p className="username-form__status username-form__status--success" role="status">
        {USERNAME_REQUEST_SUCCESS}
      </p>
    )
  }

  return (
    <form className="username-form" onSubmit={submitUsername} noValidate>
      <div className="username-form__fields">
        <div className="username-form__field">
          <label className="username-form__label" htmlFor="requester-name">
            {NAME_REQUEST_LABEL}
          </label>
          <input
            id="requester-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setSubmissionError('')
            }}
            placeholder={NAME_REQUEST_PLACEHOLDER}
            maxLength={80}
            autoComplete="name"
            required
            aria-describedby="name-help username-status"
            disabled={submissionState === 'submitting'}
          />
          <p className="username-form__help" id="name-help">
            Use the name your friends know you by.
          </p>
        </div>
        <div className="username-form__field">
          <label className="username-form__label" htmlFor="minecraft-username">
            {USERNAME_REQUEST_LABEL}
          </label>
          <input
            id="minecraft-username"
            name="username"
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setSubmissionError('')
            }}
            placeholder={USERNAME_REQUEST_PLACEHOLDER}
            minLength={3}
            maxLength={16}
            pattern="[A-Za-z0-9_]{3,16}"
            autoComplete="nickname"
            required
            aria-describedby="username-help username-status"
            disabled={submissionState === 'submitting'}
          />
          <p className="username-form__help" id="username-help">
            {USERNAME_REQUEST_VALIDATION}
          </p>
        </div>
      </div>
      <div className="username-form__captcha">
        <p className="username-form__label">{TURNSTILE_LABEL}</p>
        <TurnstileWidget
          client={turnstileClient}
          siteKey={turnstileSiteKey}
          onReady={handleTurnstileReady}
          onToken={handleTurnstileToken}
        />
      </div>
      <div className="username-form__row">
        <button className="copy-button" type="submit" disabled={submissionState === 'submitting'}>
          {submissionState === 'submitting' ? USERNAME_REQUEST_SUBMITTING : USERNAME_REQUEST_SUBMIT}
        </button>
      </div>
      <p
        className={submissionState === 'failed' ? 'username-form__status username-form__status--error' : 'username-form__status'}
        id="username-status"
        role={submissionState === 'failed' ? 'alert' : undefined}
        aria-live="polite"
      >
        {submissionState === 'failed' ? submissionError : ''}
      </p>
    </form>
  )
}

type CountdownSnapshot = {
  isLive: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function getCountdownSnapshot(nowMs: number, launchMs = LAUNCH_DATE_MS): CountdownSnapshot {
  const remainingMs = launchMs - nowMs
  if (remainingMs <= 0) {
    return { isLive: true, days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { isLive: false, days, hours, minutes, seconds }
}

type LaunchCountdownProps = {
  now?: () => number
}

export function LaunchCountdown({ now = Date.now }: LaunchCountdownProps) {
  const [snapshot, setSnapshot] = useState(() => getCountdownSnapshot(now()))

  useEffect(() => {
    const update = () => setSnapshot(getCountdownSnapshot(now()))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [now])

  return (
    <section className="ruled-band countdown-band" id="launch" aria-labelledby="countdown-heading">
      <div className="page-frame countdown-band__inner">
        <div className="section-intro">
          <p className="eyebrow">{COUNTDOWN_EYEBROW}</p>
          <h2 id="countdown-heading">{COUNTDOWN_HEADING}</h2>
          <p>{COUNTDOWN_BODY}</p>
        </div>
        <div
          className={snapshot.isLive ? 'launch-countdown launch-countdown--live' : 'launch-countdown'}
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={snapshot.isLive ? COUNTDOWN_LIVE : COUNTDOWN_WAITING}
        >
          {snapshot.isLive ? (
            <p className="launch-countdown__live" role="status">{COUNTDOWN_LIVE}</p>
          ) : (
            <>
              <p className="launch-countdown__label">{COUNTDOWN_WAITING}</p>
              <dl className="launch-countdown__units">
                <div><dt>Days</dt><dd>{String(snapshot.days).padStart(2, '0')}</dd></div>
                <div><dt>Hours</dt><dd>{String(snapshot.hours).padStart(2, '0')}</dd></div>
                <div><dt>Minutes</dt><dd>{String(snapshot.minutes).padStart(2, '0')}</dd></div>
                <div><dt>Seconds</dt><dd>{String(snapshot.seconds).padStart(2, '0')}</dd></div>
              </dl>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

type ExternalLinkProps = {
  href: string
  children: ReactNode
  className?: string
}

function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

function FieldGuideArt() {
  return (
    <figure className="field-art" role="img" aria-labelledby="field-art-caption">
      <div className="field-art__scene" aria-hidden="true">
        <span className="field-art__sun" />
        <span className="field-art__ridge field-art__ridge--back" />
        <span className="field-art__ridge field-art__ridge--front" />
        <span className="field-art__field" />
        <span className="field-art__path" />
        <span className="field-art__tree-trunk" />
        <span className="field-art__tree-crown field-art__tree-crown--low" />
        <span className="field-art__tree-crown field-art__tree-crown--high" />
        <span className="field-art__cabin-wall" />
        <span className="field-art__cabin-roof" />
        <span className="field-art__cabin-door" />
        <span className="field-art__cabin-window field-art__cabin-window--left" />
        <span className="field-art__cabin-window field-art__cabin-window--right" />
        <span className="field-art__smoke field-art__smoke--one" />
        <span className="field-art__smoke field-art__smoke--two" />
        <span className="field-art__fence field-art__fence--one" />
        <span className="field-art__fence field-art__fence--two" />
        <span className="field-art__fence field-art__fence--three" />
      </div>
      <figcaption id="field-art-caption" className="sr-only">
        Original CSS block art of a cabin beside a field, tree, and path.
      </figcaption>
    </figure>
  )
}

export type CozyFriendsAppProps = {
  now?: () => number
  clock?: () => number
  turnstileClient?: TurnstileClient
  turnstileSiteKey?: string
}

export function CozyFriendsApp({ now, clock, turnstileClient, turnstileSiteKey }: CozyFriendsAppProps = {}) {
  const configuredTurnstileSiteKey = (turnstileSiteKey ?? import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
  const countdownNow = now ?? clock
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const copyServerAddress = async () => {
    setCopyState('idle')
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable')
      }
      await navigator.clipboard.writeText(SERVER_ADDRESS)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  const copyLabel = copyState === 'copied'
    ? 'Copied'
    : copyState === 'failed'
      ? 'Copy failed. Select the address manually.'
      : 'Copy server address'

  return (
    <div className="cozy-site">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <header className="site-header" role="banner">
        <div className="page-frame site-header__inner">
          <a className="wordmark" href="#welcome" aria-label="Cozy Friends home">
            <span className="wordmark__mark" aria-hidden="true">CF</span>
            <span>Cozy Friends</span>
          </a>
          <nav className="site-nav" aria-label="Field guide navigation">
            <a href="#launch">Launch</a>
            <a href="#install">Install</a>
            <a href="#connect">Connect</a>
            <a href="#troubleshooting">Help</a>
            <a href="#request">Join</a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-band" id="welcome" aria-labelledby="hero-heading">
          <div className="page-frame hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{HERO_EYEBROW}</p>
              <h1 id="hero-heading">{HERO_HEADING}</h1>
              <p className="hero-body">{HERO_BODY}</p>
              <p className="version-line">{VERSION_LINE}</p>

              <div className="address-block" aria-label="Minecraft server address">
                <p className="address-label">Server address</p>
                <div className="address-row">
                  <code className="server-address" tabIndex={0} title="Select to copy manually">{SERVER_ADDRESS}</code>
                  <button
                    className={copyState === 'failed' ? 'copy-button copy-button--error' : 'copy-button'}
                    type="button"
                    aria-live="polite"
                    aria-atomic="true"
                    onClick={copyServerAddress}
                  >
                    {copyLabel}
                  </button>
                </div>

              </div>
              <p className="invite-note">{INVITE_NOTE}</p>
            </div>
            <FieldGuideArt />
          </div>
        </section>

        <LaunchCountdown now={countdownNow} />

        <section className="ruled-band request-band" id="request" aria-labelledby="request-heading">
          <div className="page-frame split-band">
            <div className="section-intro">
              <p className="eyebrow">{USERNAME_REQUEST_EYEBROW}</p>
              <h2 id="request-heading">{USERNAME_REQUEST_HEADING}</h2>
              <p>{USERNAME_REQUEST_BODY}</p>
            </div>
            <UsernameRequestForm turnstileClient={turnstileClient} turnstileSiteKey={configuredTurnstileSiteKey} />
          </div>
        </section>

        <section className="ruled-band install-band" id="install" aria-labelledby="install-heading">
          <div className="page-frame">
            <div className="section-intro">
              <p className="eyebrow">START HERE</p>
              <h2 id="install-heading">Choose your launcher</h2>
              <p>Use the same Homestead 1.3.7 profile whichever launcher feels most at home.</p>
            </div>
            <ol className="launcher-list">
              {LAUNCHER_GUIDES.map((guide) => (
                <li className="launcher-guide" key={guide.name}>
                  <div className="launcher-guide__number" aria-hidden="true" />
                  <h3>{guide.name}</h3>
                  <p>
                    <span className="launcher-guide__name">{guide.name}:</span>{' '}
                    {guide.instructions}
                  </p>
                  <ExternalLink className="launcher-guide__link" href={guide.href}>{guide.linkLabel}</ExternalLink>
                </li>
              ))}
            </ol>
            <p className="guide-note">For the full client setup, read the CozyStudios installation guide before launching.</p>
          </div>
        </section>

        <section className="ruled-band connect-band" id="connect" aria-labelledby="connect-heading">
          <div className="page-frame split-band">
            <div className="section-intro">
              <p className="eyebrow">ONCE YOU ARE READY</p>
              <h2 id="connect-heading">Meet us in the world</h2>
            </div>
            <ol className="connection-list">
              {CONNECTION_STEPS.map((step, index) => (
                <li key={step}>
                  <span className="step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span>{index === 2 ? <>Set the name to <strong>Cozy Friends Server</strong> and address to <code>{SERVER_ADDRESS}</code>.</> : step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="community-band" aria-labelledby="community-heading">
          <div className="page-frame community-band__inner">
            <p className="eyebrow">A SHARED PLACE</p>
            <h2 id="community-heading">Leave the world better than you found it.</h2>
            <p className="community-line">{COMMUNITY_LINE}</p>
          </div>
        </section>

        <section className="ruled-band troubleshooting-band" id="troubleshooting" aria-labelledby="troubleshooting-heading">
          <div className="page-frame split-band split-band--troubleshooting">
            <div className="section-intro">
              <p className="eyebrow">FIELD NOTES</p>
              <h2 id="troubleshooting-heading">If the path gets muddy</h2>
              <p>Most first-day snags have a simple fix. Check these before rebuilding your profile.</p>
            </div>
            <ul className="troubleshooting-list">
              {TROUBLESHOOTING.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}:</strong> {item.guidance}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="resources-band" aria-labelledby="resources-heading">
          <div className="page-frame resources-band__inner">
            <div>
              <p className="eyebrow">OFFICIAL SOURCES</p>
              <h2 id="resources-heading">Keep these close</h2>
            </div>
            <ul className="resource-list">
              {RESOURCE_LINKS.map((resource) => (
                <li key={resource.href}>
                  <ExternalLink className="resource-link" href={resource.href}>{resource.label}</ExternalLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-frame site-footer__inner">
          <p>Cozy Friends Server · Homestead 1.3.7</p>
          <p>Bring a build, a story, or just a little time.</p>
        </div>
      </footer>
    </div>
  )
}

export default CozyFriendsApp
