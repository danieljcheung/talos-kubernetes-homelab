import { type FormEvent, useEffect, useRef, useState } from "react"
import { PROJECTS, SELECTED_PROJECTS, type Project } from "../../data/projects"
import type { ConnectionState, PortfolioView } from "../three/scene-types"

export type SoulContentProps = {
  view: Exclude<PortfolioView, null>
  onClose(): void
  interactive: boolean
  onChatStateChange?(state: ConnectionState): void
  className?: string
}

type ChatMessage = { role: "user" | "assistant"; content: string }

const ABOUT_SENTENCE = "Daniel Cheung builds practical systems and AI automation, with a focus on reliable infrastructure and thoughtful interfaces."
const SKILLS = [
  "Kubernetes",
  "Talos Linux",
  "Immutable infrastructure",
  "Bare-metal cluster administration",
  "talosctl / kubectl",
  "GitOps / Argo CD",
  "Tailscale private networking",
  "Kubernetes Ingress and Services",
  "Headlamp dashboard operations",
  "Containerized deployments",
  "Monitoring and observability",
  "Security-focused infrastructure design",
] as const

function ProjectRow({ project }: { project: Project }) {
  return (
    <article className="soul-project-row">
      <div className="soul-project-heading">
        <h3>{project.displayName || project.name}</h3>
        {project.language && <span className="soul-meta">{project.language}</span>}
      </div>
      <p className="soul-project-description">{project.description}</p>
      <div className="soul-topics">
        {project.topics.map((topic) => <span key={topic}>#{topic}</span>)}
      </div>
      <a className="soul-link" href={project.html_url} target="_blank" rel="noreferrer">View project</a>
    </article>
  )
}

function AboutBody() {
  return (
    <div className="soul-about-body">
      <p className="soul-lede">{ABOUT_SENTENCE}</p>
      <ul className="soul-facts">
        <li>Computer Science at Western University</li>
        <li>Multi-node Talos Linux Kubernetes homelab</li>
        <li>Practical AI automation</li>
        <li>Reliable systems are a design problem.</li>
      </ul>
    </div>
  )
}

function WorkBody() {
  const selected = new Set(SELECTED_PROJECTS.map((project) => project.name))
  const remaining = PROJECTS.filter((project) => !selected.has(project.name))
  return (
    <div>
      <section>
        <h2 className="font-mono text-xs uppercase tracking-[.2em] text-[#ffb21c]">Selected work</h2>
        {SELECTED_PROJECTS.map((project) => <ProjectRow key={project.name} project={project} />)}
      </section>
      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-[.2em] text-[#ffb21c]">Project index</h2>
        {remaining.map((project) => <ProjectRow key={project.name} project={project} />)}
      </section>
    </div>
  )
}

function ResumeBody() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="label">Profile</h2>
        <p>{ABOUT_SENTENCE}</p>
      </section>
      <section>
        <h2 className="label">Education</h2>
        <p>Computer Science - Western University</p>
      </section>
      <section>
        <h2 className="label">Selected systems</h2>
        <p className="mb-4">Designed and operated a multi-node bare-metal Talos Linux Kubernetes homelab with GitOps-based deployments, private Tailscale admin access, Kubernetes dashboards, and documented infrastructure workflows on real hardware.</p>
        {SELECTED_PROJECTS.map((project) => <ProjectRow key={project.name} project={project} />)}
      </section>
      <section>
        <h2 className="label">Skills</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SKILLS.map((skill) => <li key={skill}>{skill}</li>)}
        </ul>
      </section>
    </div>
  )
}

function createSessionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

function ChatBody({ onChatStateChange }: { onChatStateChange?: (state: ConnectionState) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi, ask me about Daniel's work, experience, or interests." },
  ])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const storage = typeof sessionStorage !== "undefined" ? sessionStorage : null
      let id = storage?.getItem("buddy_session_id")
      if (!id) {
        id = createSessionId()
        storage?.setItem("buddy_session_id", id)
      }
      setSessionId(id)
    } catch {
      setSessionId(createSessionId())
    }
  }, [])

  const state: ConnectionState = loading ? "Thinking" : error === "Rate limited" ? "Rate limited" : error ? "Offline" : "Ready"

  useEffect(() => {
    onChatStateChange?.(state)
  }, [onChatStateChange, state])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" })
  }, [messages])

  async function send(event: FormEvent) {
    event.preventDefault()
    const message = input.trim()
    if (!message || loading) return
    setInput("")
    setError(null)
    const next = [...messages, { role: "user" as const, content: message }]
    setMessages(next)
    setLoading(true)
    try {
      const base = (import.meta as ImportMeta & { env?: { VITE_BUDDY_CHAT_URL?: string } }).env?.VITE_BUDDY_CHAT_URL || ""
      const endpoint = base.endsWith("/v1/chat") ? base : `${base}/v1/chat`
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId, history: next.slice(1, -1) }),
      })
      if (response.status === 429) {
        setError("Rate limited")
        return
      }
      if (!response.ok) throw new Error("Chat request failed")
      const data = await response.json() as { reply?: unknown }
      if (typeof data.reply !== "string") throw new Error("Malformed chat response")
      setMessages([...next, { role: "assistant", content: data.reply }])
    } catch {
      setError("Offline")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex justify-between border-b border-amber-900/50 pb-2 font-mono text-xs">
        <span>Daniel interface</span><span>{state}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4" aria-live="polite">
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[80%] bg-[#7a2600] p-3" : "max-w-[80%] border border-amber-900/50 p-3"}>{message.content}</p>
        ))}
        <div ref={endRef} />
      </div>
      {error && <p role="alert" className="mb-2 text-sm text-[#ffb21c]">{error}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input aria-label="Message" value={input} onChange={(event) => setInput(event.target.value)} className="min-w-0 flex-1 border border-amber-900 bg-transparent p-3" />
        <button className="border border-[#ffb21c] px-4 text-[#ffb21c]">Send</button>
      </form>
    </div>
  )
}

function viewTitle(view: Exclude<PortfolioView, null>) {
  switch (view) {
    case "about": return "About"
    case "work": return "Work"
    case "resume": return "Resume"
    case "chat": return "Chat"
  }
}

function viewBody(view: Exclude<PortfolioView, null>, onChatStateChange?: (state: ConnectionState) => void) {
  switch (view) {
    case "about": return <AboutBody />
    case "work": return <WorkBody />
    case "resume": return <ResumeBody />
    case "chat": return <ChatBody onChatStateChange={onChatStateChange} />
  }
}

export function SoulContent({ view, onClose, interactive, onChatStateChange, className = "" }: SoulContentProps) {
  const shellRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (interactive) shellRef.current?.querySelector<HTMLElement>("h1")?.focus()
  }, [interactive])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <section
      ref={shellRef}
      id="soul-content"
      aria-labelledby="soul-content-title"
      aria-hidden={!interactive}
      inert={!interactive ? true : undefined}
      className={`fixed inset-x-0 bottom-0 top-[clamp(11rem,24vh,15rem)] mx-auto max-w-[960px] overflow-y-auto px-6 pb-12 text-[#fff4e6] ${interactive ? "opacity-100" : "pointer-events-none opacity-0"} ${className}`}
    >
      <h1 id="soul-content-title" tabIndex={-1} className="mb-8 font-mono text-sm uppercase tracking-[.25em] text-[#ffb21c]">{viewTitle(view)}</h1>
      <div>{viewBody(view, onChatStateChange)}</div>
      <button type="button" onClick={onClose} className="mt-10 border border-[#ffb21c] px-4 py-2 text-sm text-[#ffb21c]">Back to soul</button>
    </section>
  )
}

export default SoulContent
