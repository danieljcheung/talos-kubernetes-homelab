import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  COUNTDOWN_BODY,
  COUNTDOWN_EYEBROW,
  COUNTDOWN_HEADING,
  COUNTDOWN_LIVE,
  COUNTDOWN_UNITS,
  COUNTDOWN_WAITING,
  FOOTER_TAG,
  HERO_BODY,
  HERO_HEADING,
  JOIN_HEADING,
  JOIN_STEPS,
  LAUNCH_DATE_MS,
  NAME_REQUEST_LABEL,
  NAME_REQUEST_PLACEHOLDER,
  NAME_REQUEST_VALIDATION,
  RESOURCE_LINKS,
  SERVER_ADDRESS,
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

  const units = [
    { label: COUNTDOWN_UNITS[0], value: snapshot.days },
    { label: COUNTDOWN_UNITS[1], value: snapshot.hours },
    { label: COUNTDOWN_UNITS[2], value: snapshot.minutes },
    { label: COUNTDOWN_UNITS[3], value: snapshot.seconds }
  ]

  return (
    <section className="ruled-band countdown-band" id="launch" aria-labelledby="countdown-heading">
      <div className="page-frame countdown-band__inner">
        <div className="countdown-meta" id="features">
          <img className="countdown-meta__icon" src="/assets/cozy-calendar.webp" alt="" aria-hidden="true" />
          <div>
            <p className="eyebrow">{COUNTDOWN_EYEBROW}</p>
            <h2 id="countdown-heading">{COUNTDOWN_HEADING}</h2>
            <p className="countdown-meta__body">{COUNTDOWN_BODY}</p>
          </div>
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
                {units.map((unit) => (
                  <div key={unit.label}>
                    <dt>{unit.label}</dt>
                    <dd>{String(unit.value).padStart(2, '0')}</dd>
                  </div>
                ))}
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

const JOIN_ICON_ASSETS = {
  download: '/assets/cozy-download.webp',
  user: '/assets/cozy-user.webp',
  connect: '/assets/cozy-connect.webp'
} as const
const SAPLING_ASSET = '/assets/cozy-sapling.webp'

function FieldGuideArt() {
  return (
    <figure className="field-art" id="gallery" role="img" aria-label="Field guide illustration of a cozy cabin beside a field, tree, and winding path.">
      <img
        className="field-art__image"
        src="/assets/cozy-hero.webp"
        width="1122"
        height="1402"
        alt=""
        aria-hidden="true"
      />
      <figcaption id="field-art-caption" className="sr-only">
        Field guide illustration of a cozy cabin beside a field, tree, and winding path.
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
            <img className="wordmark__mark" src={SAPLING_ASSET} alt="" aria-hidden="true" />
            <span className="wordmark__details">
              <span className="wordmark__name">cozy friends</span>
              <span className="wordmark__subtitle">A MINECRAFT SERVER</span>
            </span>
          </a>
          <nav className="site-nav" aria-label="Main navigation">
            <a className="site-nav__link site-nav__link--active" href="#welcome" aria-current="page">HOME</a>
            <a className="site-nav__link" href="#about">ABOUT</a>
            <a className="site-nav__link" href="#features">FEATURES</a>
            <a className="site-nav__link" href="#gallery">GALLERY</a>
            <a className="site-nav__link" href="#join">JOIN</a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-band" id="welcome" aria-labelledby="hero-heading">
          <div className="page-frame hero-grid">
            <div className="hero-copy">
              <h1 id="hero-heading">{HERO_HEADING}</h1>
              <div className="hero-copy__about" id="about">
                <p className="hero-body">{HERO_BODY}</p>
              </div>
              <div className="hero-actions">
                <a className="hero-primary" href="#request">
                  <img className="hero-action__icon" src={SAPLING_ASSET} alt="" aria-hidden="true" />
                  JOIN COZY FRIENDS
                </a>
                <a className="hero-secondary" href="#about">
                  LEARN MORE
                  <span className="hero-action__arrow" aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
            <FieldGuideArt />
          </div>
        </section>

        <LaunchCountdown now={countdownNow} />

        <section className="join-band ruled-band" id="join" aria-labelledby="join-heading">
          <div className="page-frame">
            <div className="join-heading">
              <img className="join-heading__mark" src={SAPLING_ASSET} alt="" aria-hidden="true" />
              <h2 id="join-heading">{JOIN_HEADING}</h2>
            </div>
            <ol className="join-steps">
              {JOIN_STEPS.map((step) => (
                <li className="join-step" key={step.number}>
                  <span className="join-step__number" aria-hidden="true">{step.number}</span>
                  <img
                    className="join-step__icon"
                    src={JOIN_ICON_ASSETS[step.icon]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    aria-hidden="true"
                  />
                  <div className="join-step__copy">
                    <h3>{step.label}</h3>
                    <p>{step.copy}</p>
                    {step.href && step.href.startsWith('#') ? (
                      <a className="join-step__link" href={step.href}>{step.linkLabel}</a>
                    ) : step.href ? (
                      <ExternalLink className="join-step__link" href={step.href}>{step.linkLabel}</ExternalLink>
                    ) : null}
                    {step.number === '3' ? (
                      <div className="server-address-card">
                        <span className="server-address-card__label">SERVER ADDRESS</span>
                        <div className="server-address-card__row">
                          <code className="server-address-card__address" tabIndex={0} title="Select to copy manually">
                            {SERVER_ADDRESS}
                          </code>
                          <button
                            className={copyState === 'failed'
                              ? 'server-address-card__button copy-button--error'
                              : 'server-address-card__button'}
                            type="button"
                            aria-live="polite"
                            aria-atomic="true"
                            aria-label={copyLabel}
                            onClick={copyServerAddress}
                          >
                            {copyLabel}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="request-band ruled-band" id="request" aria-labelledby="request-heading">
          <div className="page-frame request-layout">
            <div className="request-copy">
              <p className="eyebrow">{USERNAME_REQUEST_EYEBROW}</p>
              <h2 id="request-heading">{USERNAME_REQUEST_HEADING}</h2>
              <p>{USERNAME_REQUEST_BODY}</p>
              <div className="official-links" aria-labelledby="official-links-heading">
                <p className="official-links__label" id="official-links-heading">OFFICIAL HOMESTEAD LINKS</p>
                <ul>
                  {RESOURCE_LINKS.map((resource) => (
                    <li key={resource.href}>
                      <ExternalLink href={resource.href}>{resource.label}</ExternalLink>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <UsernameRequestForm turnstileClient={turnstileClient} turnstileSiteKey={configuredTurnstileSiteKey} />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-frame site-footer__inner">
          <div className="footer-brand">
            <img className="wordmark__mark" src={SAPLING_ASSET} alt="" aria-hidden="true" />
            <span className="footer-brand__details">
              <span className="footer-brand__name">cozy friends</span>
              <span className="footer-brand__subtitle">A MINECRAFT SERVER</span>
            </span>
          </div>
          <p className="footer-tag">
            <span className="footer-tag__icon" aria-hidden="true">♥</span>
            {FOOTER_TAG}
          </p>
          <p className="footer-address">
            <span className="footer-address__marker" aria-hidden="true" />
            <code>{SERVER_ADDRESS}</code>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default CozyFriendsApp
