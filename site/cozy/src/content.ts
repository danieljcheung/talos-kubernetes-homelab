export const SERVER_ADDRESS = 'mc.popinvites.com'
export const HERO_EYEBROW = 'COZY FRIENDS SERVER'
export const HERO_HEADING = 'Build slow. Wander far. Come home.'
export const HERO_BODY = 'A shared Homestead world for chilling, building, and adventuring with friends.'
export const VERSION_LINE = 'Homestead 1.3.7 • Minecraft 1.20.1 • Fabric • Java Edition'
export const INVITE_NOTE = 'Invite-only. Ask Dan to add your exact Minecraft username before joining.'
export const LAUNCH_DATE_ISO = '2026-08-13T20:00:00-04:00'
export const LAUNCH_DATE_MS = Date.parse(LAUNCH_DATE_ISO)
export const COUNTDOWN_EYEBROW = 'COUNTDOWN TO LAUNCH'
export const COUNTDOWN_HEADING = 'The first campfire is almost ready.'
export const COUNTDOWN_BODY = 'We open the Homestead world on Thursday, August 13 at 8:00 PM Eastern.'
export const COUNTDOWN_LIVE = 'Launch is live. Welcome to the world.'
export const COUNTDOWN_WAITING = 'Time until launch'
export const COUNTDOWN_UNITS = ['days', 'hours', 'minutes', 'seconds'] as const

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

export type LauncherGuide = {
  name: string
  instructions: string
  href: string
  linkLabel: string
}

export const LAUNCHER_GUIDES: readonly LauncherGuide[] = [
  {
    name: 'CurseForge',
    instructions: 'Install the CurseForge app, search for Homestead, choose version 1.3.7, allocate 8 GiB client RAM, and launch.',
    href: OFFICIAL_LINKS.curseforge,
    linkLabel: 'Open Homestead 1.3.7 on CurseForge'
  }
]

export const CONNECTION_STEPS = [
  'Launch the Homestead 1.3.7 profile.',
  'Choose Multiplayer, then Add Server.',
  'Set the name to Cozy Friends Server and address to mc.popinvites.com.',
  'Submit the username above, then join after Dan approves the allowlist entry.'
] as const

export const COMMUNITY_LINE = 'Build with care. Ask before borrowing. Repair creeper damage. Keep shared paths usable. Leave room for everyone.'

export type TroubleshootingItem = {
  label: string
  guidance: string
}

export const TROUBLESHOOTING: readonly TroubleshootingItem[] = [
  {
    label: 'Incompatible mods',
    guidance: 'confirm Homestead 1.3.7, Minecraft 1.20.1, Fabric, and the official Modrinth FTB additions.'
  },
  {
    label: 'Not whitelisted',
    guidance: 'Submit the exact case-sensitive Java username above, then wait for Dan to approve it.'
  },
  {
    label: 'Java/startup crash',
    guidance: 'use Java 17 and allocate 8 GiB, leaving memory for the launcher and operating system.'
  },
  {
    label: 'Timeout',
    guidance: 'confirm the server announcement before changing the pack or deleting local files.'
  }
]

export const RESOURCE_LINKS = [
  { label: 'Modrinth version page', href: OFFICIAL_LINKS.modrinth },
  { label: 'CurseForge 1.3.7 file', href: OFFICIAL_LINKS.curseforge },
  { label: 'CozyStudios installation guide', href: OFFICIAL_LINKS.installation },
  { label: 'FTB additions guide', href: OFFICIAL_LINKS.ftbAdditions },
  { label: 'Official server-pack page', href: OFFICIAL_LINKS.serverPack }
] as const
