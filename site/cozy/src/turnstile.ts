export type TurnstileWidgetId = string | number

export type TurnstileRenderOptions = {
  sitekey: string
  callback: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

export type TurnstileClient = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => TurnstileWidgetId
  reset?: (widgetId?: TurnstileWidgetId) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileClient
  }
}

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let turnstileScriptPromise: Promise<TurnstileClient> | undefined

export function loadTurnstile(): Promise<TurnstileClient> {
  const existingClient = typeof window !== 'undefined' ? window.turnstile : undefined
  if (existingClient) {
    return Promise.resolve(existingClient)
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise
  }

  turnstileScriptPromise = new Promise<TurnstileClient>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_URL}"]`
    )
    const script = existingScript ?? document.createElement('script')

    const complete = () => {
      const client = typeof window !== 'undefined' ? window.turnstile : undefined
      if (client) {
        resolve(client)
      } else {
        reject(new Error('Turnstile loaded without a client'))
      }
    }
    const fail = () => reject(new Error('Turnstile script failed to load'))

    script.addEventListener('load', complete, { once: true })
    script.addEventListener('error', fail, { once: true })
    if (!existingScript) {
      script.async = true
      script.defer = true
      script.src = TURNSTILE_SCRIPT_URL
      document.head.appendChild(script)
    }
  }).catch((error) => {
    turnstileScriptPromise = undefined
    throw error
  })

  return turnstileScriptPromise
}
