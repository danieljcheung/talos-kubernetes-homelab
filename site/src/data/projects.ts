export interface Project {
  name: string;
  displayName: string;
  description: string;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    name: "talos-kubernetes-homelab",
    displayName: "Talos Kubernetes Homelab",
    description: "Bare-metal Talos Linux Kubernetes homelab with GitOps roadmap and documented build log",
    html_url: "https://github.com/danieljcheung/talos-kubernetes-homelab",
    language: "Kubernetes / GitOps",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["kubernetes", "talos-linux", "gitops", "argo-cd", "tailscale", "longhorn", "prometheus", "grafana"],
    updated_at: "2026-07-10T07:51:15Z",
    featured: true
  },
  {
    name: "apply-agent",
    displayName: "Apply Agent",
    description: "Autonomous job application agent that manages resume tailoring, email communication via Proton Bridge, and application tracking.",
    html_url: "https://github.com/danieljcheung/apply-agent",
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["ai-agent", "resumes", "puppeteer", "automation", "postgres", "fastify"],
    updated_at: "2026-07-01T23:25:28Z",
    featured: true
  },
  {
    name: "previewapp-operator",
    displayName: "PreviewApp Operator",
    description: "Kubernetes operator for ephemeral PopInvites preview apps",
    html_url: "https://github.com/danieljcheung/previewapp-operator",
    language: "Go",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["kubernetes-operator", "go", "controller-runtime", "gitops", "ephemeral-environments"],
    updated_at: "2026-06-20T19:16:44Z",
    featured: true
  },
  {
    name: "whisper",
    displayName: "Whisper",
    description: "Private short-lived clipboard for trusted devices",
    html_url: "https://github.com/danieljcheung/whisper",
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["security", "nextjs", "kubernetes", "tailscale", "sops", "clipboard"],
    updated_at: "2026-06-16T19:23:44Z",
    featured: true
  },
  {
    name: "company-brain",
    displayName: "Company Brain",
    description: "Popup Pearl catering inbox, company brain, and ingestion workflow",
    html_url: "https://github.com/danieljcheung/company-brain",
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["nextjs", "prisma", "postgres", "gmail-api", "event-ingestion", "automation"],
    updated_at: "2026-06-12T20:22:14Z"
  },
  {
    name: "kin",
    displayName: "Kin",
    description: "Family assistant powered by OpenClaw, hosted on AWS, that helps households coordinate schedules, reminders, tasks, and shared context through natural conversation.",
    html_url: "https://github.com/danieljcheung/kin",
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["openclaw", "aws", "prisma", "postgres", "voice-assistant", "scheduling"],
    updated_at: "2026-05-04T23:42:45Z"
  },
  {
    name: "Portfolio",
    displayName: "Portfolio",
    description: "Personal portfolio website for Daniel Cheung - CS student focused on security and AI",
    html_url: "https://github.com/danieljcheung/Portfolio",
    language: "HTML",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["portfolio", "html", "css", "static-site"],
    updated_at: "2026-04-30T18:15:36Z"
  },
  {
    name: "agent-poker",
    displayName: "Agent Poker",
    description: "Competitive poker arena for AI agents. Build a bot, join the table, outsmart the competition.",
    html_url: "https://github.com/danieljcheung/agent-poker",
    language: "HTML",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["ai-poker", "game-arena", "reinforcement-learning", "bots", "canvas"],
    updated_at: "2026-02-04T17:52:26Z"
  },
  {
    name: "ShellSpace",
    displayName: "ShellSpace",
    description: "Pick your shell. A creative portfolio platform for AI agents.",
    html_url: "https://github.com/danieljcheung/ShellSpace",
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["agents", "shell", "react", "terminal-theme"],
    updated_at: "2026-02-02T07:14:52Z"
  },
  {
    name: "Unsub",
    displayName: "Unsub",
    description: "A client-side Gmail mass unsubscribe tool",
    html_url: "https://github.com/danieljcheung/Unsub",
    language: "JavaScript",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["gmail", "unsubscribe", "privacy", "client-side", "oauth2"],
    updated_at: "2026-02-02T04:54:22Z"
  },
  {
    name: "Pal",
    displayName: "Pal",
    description: "A digital companion that starts knowing nothing and grows with its owner",
    html_url: "https://github.com/danieljcheung/Pal",
    language: "Python",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["assistant", "local-llm", "companion", "python", "voice"],
    updated_at: "2026-01-23T06:37:49Z"
  },
  {
    name: "security-sensei",
    displayName: "Security Sensei",
    description: "Find vulnerabilities. Learn why they matter. A security scanner that teaches you how to fix issues.",
    html_url: "https://github.com/danieljcheung/security-sensei",
    language: "Python",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["security-scanner", "vulnerability", "education", "sast", "python"],
    updated_at: "2026-01-18T16:05:40Z"
  },
  {
    name: "TRACE",
    displayName: "TRACE",
    description: "Self-assessment OSINT tool - discover your digital exposure from just an email address.",
    html_url: "https://github.com/danieljcheung/TRACE",
    language: "Python",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["osint", "privacy", "security", "reconnaissance", "email-lookup"],
    updated_at: "2026-01-15T21:10:29Z"
  },
  {
    name: "tidy-ios",
    displayName: "Tidy iOS",
    description: "Privacy-first iOS photo management app with swipe gestures. 100% offline, zero analytics.",
    html_url: "https://github.com/danieljcheung/tidy-ios",
    language: "Swift",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["ios-app", "swift", "swiftui", "photo-cleaner", "privacy-first"],
    updated_at: "2026-01-12T18:23:08Z"
  },
  {
    name: "Squish",
    displayName: "Squish",
    description: "A mobile app that lets anyone create personalized AI agents (fitness coach, budget helper, etc.) through friendly onboarding interviews. Each agent is an anime-style slime that transforms into a specialized persona. Built with Expo, Supabase, and Claude.",
    html_url: "https://github.com/danieljcheung/Squish",
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["react-native", "expo", "supabase", "claude-api", "ai-companion"],
    updated_at: "2026-01-11T21:35:30Z"
  }
];

const projectByName = (name: string): Project => {
  const project = PROJECTS.find(candidate => candidate.name === name);
  if (!project) throw new Error(`Missing selected project: ${name}`);
  return project;
};

export const SELECTED_PROJECTS: Project[] = [
  {
    ...projectByName("talos-kubernetes-homelab"),
    displayName: "Talos Kubernetes Cluster",
  },
  {
    ...projectByName("company-brain"),
    displayName: "Popup Pearl Dashboard",
    description: "Operational dashboard for Popup Pearl's catering inbox, event ingestion, and company knowledge workflows. Demo password: demo_app_password.",
    html_url: "https://pearldemo.danieljcheung.com",
  },
  {
    name: "local-business-prospector",
    displayName: "Local Business Prospector",
    description: "Google Places prospecting dashboard with an agent-driven pipeline for generating tailored local-business website drafts.",
    html_url: "https://prospectordemo.danieljcheung.com",
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    topics: ["google-places", "ai-agents", "website-generation", "cloudflare-r2", "kubernetes"],
    updated_at: "2026-07-14T00:00:00Z",
  },
  {
    ...projectByName("whisper"),
    description: "Private short-lived clipboard demo. Demo password: demo-password-clearly-fake.",
    html_url: "https://whisperdemo.danieljcheung.com",
  },
  projectByName("previewapp-operator"),
];
