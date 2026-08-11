import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import SoulContent from "../components/portfolio/SoulContent"
import { PROJECTS, SELECTED_PROJECTS } from "../data/projects"
import type { ConnectionState } from "../components/three/scene-types"

function renderView(view: "about" | "work" | "resume" | "chat", onChatStateChange?: (state: ConnectionState) => void) {
  return render(<SoulContent view={view} interactive onClose={vi.fn()} onChatStateChange={onChatStateChange} />)
}

async function send(message: string) {
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: message } })
  fireEvent.click(screen.getByRole("button", { name: "Send" }))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe("SoulContent", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
    Element.prototype.scrollIntoView = vi.fn()
  })

  test("renders only the confirmed About sentence and four facts", () => {
    renderView("about")
    expect(screen.getByText("Daniel Cheung builds practical systems and AI automation, with a focus on reliable infrastructure and thoughtful interfaces.")).toBeInTheDocument()
    expect(screen.getByText("Computer Science at Western University")).toBeInTheDocument()
    expect(screen.getByText("Multi-node Talos Linux Kubernetes homelab")).toBeInTheDocument()
    expect(screen.getByText("Practical AI automation")).toBeInTheDocument()
    expect(screen.getByText("Reliable systems are a design problem.")).toBeInTheDocument()
    expect(screen.queryByText(/award|employer|20\d\d/i)).not.toBeInTheDocument()
  })

  test("preserves every Work project field and the selected order", () => {
    renderView("work")
    const expectedProjects = [
      ...SELECTED_PROJECTS,
      ...PROJECTS.filter((project) => !SELECTED_PROJECTS.some((selected) => selected.name === project.name)),
    ]
    const projectHeadings = screen.getAllByRole("heading", { level: 3 })
    expect(projectHeadings.slice(0, SELECTED_PROJECTS.length).map((heading) => heading.textContent)).toEqual(
      SELECTED_PROJECTS.map((project) => project.displayName || project.name),
    )
    const links = screen.getAllByRole("link", { name: "View project" })
    const expectedUrls = expectedProjects.map((project) => project.html_url)
    expect(links).toHaveLength(expectedUrls.length)
    expect(links.map((link) => link.getAttribute("href"))).toEqual(expectedUrls)
    expectedProjects.forEach((project) => {
      expect(screen.getByRole("heading", { level: 3, name: project.displayName || project.name })).toBeInTheDocument()
      expect(screen.getAllByText(project.description).length).toBeGreaterThan(0)
      project.topics.forEach((topic) => expect(screen.getAllByText(`#${topic}`).length).toBeGreaterThan(0))
      if (project.language) expect(screen.getAllByText(project.language).length).toBeGreaterThan(0)
    })
  })

  test("renders the verified semantic resume without PDF or invented credentials", () => {
    renderView("resume")
    expect(screen.getByText("Computer Science - Western University")).toBeInTheDocument()
    expect(screen.getByText(/Designed and operated a multi-node bare-metal Talos Linux Kubernetes homelab/)).toBeInTheDocument()
    const projectHeadings = screen.getAllByRole("heading", { level: 3 })
    expect(projectHeadings.map((heading) => heading.textContent)).toEqual(SELECTED_PROJECTS.map((project) => project.displayName || project.name))
    const skills = [
      "Kubernetes", "Talos Linux", "Immutable infrastructure", "Bare-metal cluster administration",
      "talosctl / kubectl", "GitOps / Argo CD", "Tailscale private networking",
      "Kubernetes Ingress and Services", "Headlamp dashboard operations", "Containerized deployments",
      "Monitoring and observability", "Security-focused infrastructure design",
    ]
    skills.forEach((skill) => expect(screen.getByText(skill)).toBeInTheDocument())
    expect(document.querySelector("object")).toBeNull()
    expect(document.querySelector("[download]")).toBeNull()
    expect(document.body.textContent).not.toMatch(/\.pdf|20\d\d/)
  })

  test("closes with Escape and Back", () => {
    const onClose = vi.fn()
    render(<SoulContent view="about" interactive onClose={onClose} />)
    fireEvent.keyDown(window, { key: "Escape" })
    fireEvent.click(screen.getByRole("button", { name: "Back to soul" }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  test("preserves Chat success, rate limit, malformed response, and network failure states", async () => {
    const onState = vi.fn()
    const success = deferred<Response>()
    const limited = deferred<Response>()
    const malformed = deferred<Response>()
    const network = deferred<Response>()
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => success.promise)
      .mockImplementationOnce(() => limited.promise)
      .mockImplementationOnce(() => malformed.promise)
      .mockImplementationOnce(() => network.promise)
    renderView("chat", onState)

    await send("success")
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("Thinking"))
    await act(async () => success.resolve(new Response(JSON.stringify({ reply: "Hello" }), { status: 200, headers: { "Content-Type": "application/json" } })))
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument())
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("Ready"))

    await send("limited")
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("Thinking"))
    await act(async () => limited.resolve(new Response("", { status: 429 })))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Rate limited"))
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("Rate limited"))

    await send("malformed")
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("Thinking"))
    await act(async () => malformed.resolve(new Response(JSON.stringify({ nope: true }), { status: 200, headers: { "Content-Type": "application/json" } })))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Offline"))
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("Offline"))

    await send("network")
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("Thinking"))
    await act(async () => network.reject(new Error("network")))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Offline"))
    await waitFor(() => expect(onState).toHaveBeenLastCalledWith("Offline"))

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(onState).toHaveBeenCalledWith("Thinking")
    expect(onState).toHaveBeenCalledWith("Rate limited")
    expect(onState).toHaveBeenCalledWith("Offline")
  })
})
