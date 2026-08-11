import { useState, type FormEvent, type ReactNode } from 'react'
import {
  COMMUNITY_LINE,
  CONNECTION_STEPS,
  HERO_BODY,
  HERO_EYEBROW,
  HERO_HEADING,
  INVITE_NOTE,
  USERNAME_REQUEST_BODY,
  USERNAME_REQUEST_EYEBROW,
  USERNAME_REQUEST_HEADING,
  LAUNCHER_GUIDES,
  RESOURCE_LINKS,
  SERVER_ADDRESS,
  TROUBLESHOOTING,
  USERNAME_REQUEST_FAILURE,
  USERNAME_REQUEST_LABEL,
  USERNAME_REQUEST_PLACEHOLDER,
  USERNAME_REQUEST_SUBMIT,
  USERNAME_REQUEST_SUBMITTING,
  USERNAME_REQUEST_SUCCESS,
  USERNAME_REQUEST_VALIDATION,
  VERSION_LINE
} from './content'

type CopyState = 'idle' | 'copied' | 'failed'

type UsernameSubmissionState = 'idle' | 'submitting' | 'submitted' | 'failed'

function UsernameRequestForm() {
  const [username, setUsername] = useState('')
  const [submissionState, setSubmissionState] = useState<UsernameSubmissionState>('idle')
  const [submissionError, setSubmissionError] = useState('')

  const submitUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmissionState('submitting')
    setSubmissionError('')

    try {
      const response = await fetch('/api/usernames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
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
    <form className="username-form" onSubmit={submitUsername}>
      <label className="username-form__label" htmlFor="minecraft-username">
        {USERNAME_REQUEST_LABEL}
      </label>
      <p className="username-form__help" id="username-help">
        {USERNAME_REQUEST_VALIDATION}
      </p>
      <div className="username-form__row">
        <input
          id="minecraft-username"
          name="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={USERNAME_REQUEST_PLACEHOLDER}
          minLength={3}
          maxLength={16}
          pattern="[A-Za-z0-9_]{3,16}"
          autoComplete="nickname"
          required
          aria-describedby="username-help username-status"
          disabled={submissionState === 'submitting'}
        />
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

export function CozyFriendsApp() {
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

        <section className="ruled-band request-band" id="request" aria-labelledby="request-heading">
          <div className="page-frame split-band">
            <div className="section-intro">
              <p className="eyebrow">{USERNAME_REQUEST_EYEBROW}</p>
              <h2 id="request-heading">{USERNAME_REQUEST_HEADING}</h2>
              <p>{USERNAME_REQUEST_BODY}</p>
            </div>
            <UsernameRequestForm />
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
