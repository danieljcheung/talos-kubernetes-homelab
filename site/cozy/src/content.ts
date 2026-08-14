export const SERVER_ADDRESS = 'mc.popinvites.com'
export const HERO_HEADING = 'A cozy place, built together.'
export const HERO_BODY = 'A whitelisted Minecraft server for friends. Survive, build, explore, and make memories together.'
export const LAUNCH_DATE_ISO = '2026-08-13T20:00:00-04:00'
export const LAUNCH_DATE_MS = Date.parse(LAUNCH_DATE_ISO)
export const COUNTDOWN_EYEBROW = 'OFFICIAL LAUNCH'
export const COUNTDOWN_HEADING = 'August 13, 2026 · 8:00 PM EDT'
export const COUNTDOWN_BODY = 'The first campfire is almost ready.'
export const COUNTDOWN_LIVE = 'Launch is live. Welcome to the world.'
export const COUNTDOWN_WAITING = 'Time until launch'
export const COUNTDOWN_UNITS = ['days', 'hours', 'minutes', 'seconds'] as const
export const SERVER_STATUS_LABEL = 'LIVE SERVER'
export const SERVER_STATUS_LOADING = 'Checking the server…'
export const SERVER_STATUS_UNAVAILABLE = 'Server status is unavailable.'
export const SERVER_STATUS_PLAYERS = 'players online'

export const JOIN_HEADING = 'HOW TO JOIN'
export const JOIN_STEPS = [
  {
    number: '1',
    icon: 'download',
    label: 'DOWNLOAD MOD PACK',
    copy: 'Install Homestead 1.3.7 through CurseForge.',
    href: 'https://www.curseforge.com/minecraft/modpacks/homestead-cozy/files/8110152',
    linkLabel: 'Open CurseForge'
  },
  {
    number: '2',
    icon: 'user',
    label: 'SEND USERNAME',
    copy: 'Submit your exact Java username for the allowlist.',
    href: '#request',
    linkLabel: 'Request access'
  },
  {
    number: '3',
    icon: 'connect',
    label: 'CONNECT TO SERVER',
    copy: 'Join the world using the address below.',
    href: undefined,
    linkLabel: ''
  }
] as const

export const FOOTER_TAG = 'Good people. Cozy builds. Great times.'

export const NAME_REQUEST_LABEL = 'Name'
export const NAME_REQUEST_PLACEHOLDER = 'Your name'
export const NAME_REQUEST_VALIDATION = 'Add your name (1–80 characters).'
export const TURNSTILE_LABEL = 'Security check'
export const TURNSTILE_REQUIRED = 'Complete the security check before sending your request.'
export const TURNSTILE_UNAVAILABLE = 'The security check is not ready. Try again in a moment.'
export const USERNAME_REQUEST_EYEBROW = 'JOIN THE CAMPFIRE'
export const USERNAME_REQUEST_HEADING = 'Ask to join the world'
export const USERNAME_REQUEST_BODY = 'Enter your name and exact Minecraft Java username. Dan reviews requests before adding friends to the allowlist.'
export const USERNAME_REQUEST_LABEL = 'Minecraft Java username'
export const USERNAME_REQUEST_PLACEHOLDER = 'Your exact in-game name'
export const USERNAME_REQUEST_SUBMIT = 'Request an allowlist spot'
export const USERNAME_REQUEST_SUBMITTING = 'Sending request…'
export const USERNAME_REQUEST_SUCCESS = 'Request received. Dan will review it before you join.'
export const USERNAME_REQUEST_FAILURE = 'The request could not be sent. Try again in a moment.'
export const USERNAME_REQUEST_VALIDATION = 'Use the exact Java username: 3–16 letters, numbers, or underscores.'

export const OFFICIAL_LINKS = {
  modrinth: 'https://modrinth.com/modpack/homestead/version/WMsE2fOj',
  curseforge: 'https://www.curseforge.com/minecraft/modpacks/homestead-cozy/files/8110152',
  installation: 'https://cozystudios.org/client-guides/installing-homestead/',
  ftbAdditions: 'https://cozystudios.org/client-guides/ftb-mods-modrinth/',
  serverPack: 'https://cozystudios.org/homestead/server-pack/'
} as const


export const RESOURCE_LINKS = [
  { label: 'Modrinth version page', href: OFFICIAL_LINKS.modrinth },
  { label: 'CurseForge 1.3.7 file', href: OFFICIAL_LINKS.curseforge },
  { label: 'CozyStudios installation guide', href: OFFICIAL_LINKS.installation },
  { label: 'FTB additions guide', href: OFFICIAL_LINKS.ftbAdditions },
  { label: 'Official server-pack page', href: OFFICIAL_LINKS.serverPack }
] as const
