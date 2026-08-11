export const SERVER_ADDRESS = 'mc.popinvites.com'
export const HERO_EYEBROW = 'COZY FRIENDS SERVER'
export const HERO_HEADING = 'Build slow. Wander far. Come home.'
export const HERO_BODY = 'A shared Homestead world for cozy builds, big adventures, and good company.'
export const VERSION_LINE = 'Homestead 1.3.7 • Minecraft 1.20.1 • Fabric • Java Edition'
export const INVITE_NOTE = 'Invite-only. Send the exact Java username below; Dan approves friends before they join.'
export const USERNAME_REQUEST_EYEBROW = 'JOIN THE CAMPFIRE'
export const USERNAME_REQUEST_HEADING = 'Ask to join the world'
export const USERNAME_REQUEST_BODY = 'Leave your exact Minecraft Java username and Dan will review it before adding you to the allowlist.'
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
}

export const LAUNCHER_GUIDES: readonly LauncherGuide[] = [
  {
    name: 'CurseForge',
    instructions: 'install the CurseForge app, search for Homestead, choose version 1.3.7, allocate 8 GiB client RAM, and launch.',
  },
  {
    name: 'Prism Launcher',
    instructions: 'Add Instance, choose CurseForge, search Homestead, select 1.3.7, allocate 8 GiB, and launch.',
  },
  {
    name: 'Modrinth App',
    instructions: 'install Homestead 1.3.7, then follow the official FTB mods guide and add the listed Fabric files: FTB Quests 2001.4.13, FTB Teams 2001.3.1, FTB Essentials 2001.2.3, FTB XMod Compat 2.1.3, FTB Library 2001.2.9, FTB Filter System 20.0.1, and QuestsAdditions 1.20.1-1.4.6.',
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
