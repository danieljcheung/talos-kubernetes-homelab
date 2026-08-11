import { useState, type FormEvent } from 'react'

const ADMIN_API_PATH = '/api/admin/submissions'

type Submission = {
  id: number
  name: string
  username: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  decidedAt: string | null
}

type DashboardState = 'idle' | 'loading' | 'ready' | 'error'

async function readError(response: Response) {
  try {
    const payload: unknown = await response.json()
    if (typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string') {
      return payload.error
    }
  } catch {
    // Fall through to the status-based message.
  }
  return `Request failed (${response.status})`
}

export function AdminDashboard() {
  const [token, setToken] = useState('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [state, setState] = useState<DashboardState>('idle')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadSubmissions = async () => {
    if (!token.trim()) {
      setMessage('Enter the admin token to load requests.')
      setState('error')
      return
    }
    setState('loading')
    setMessage('')
    try {
      const response = await fetch(ADMIN_API_PATH, {
        headers: { Authorization: `Bearer ${token.trim()}` }
      })
      if (!response.ok) throw new Error(await readError(response))
      setSubmissions(await response.json() as Submission[])
      setState('ready')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Could not load requests.')
    }
  }

  const decide = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id)
    setMessage('')
    try {
      const response = await fetch(`${ADMIN_API_PATH}/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.trim()}` }
      })
      if (!response.ok) throw new Error(await readError(response))
      const updated = await response.json() as Submission
      setSubmissions((current) => current.map((submission) => submission.id === id ? updated : submission))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update request.')
    } finally {
      setBusyId(null)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadSubmissions()
  }

  return (
    <div className="cozy-site">
      <main className="admin-page page-frame" id="main-content">
        <a className="wordmark admin-page__wordmark" href="/" aria-label="Cozy Friends home">
          <img className="wordmark__mark" src="/assets/cozy-sapling.webp" alt="" aria-hidden="true" />
          <span>Cozy Friends</span>
        </a>
        <p className="eyebrow">PRIVATE FIELD NOTES</p>
        <h1>Username requests</h1>
        <p className="admin-page__intro">Review exact Java usernames before they are reconciled into the server allowlist.</p>

        <form className="admin-token-form" onSubmit={handleSubmit}>
          <label className="username-form__label" htmlFor="admin-token">Admin token</label>
          <div className="username-form__row">
            <input
              id="admin-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button className="copy-button" type="submit" disabled={state === 'loading'}>
              {state === 'loading' ? 'Loading…' : 'Load requests'}
            </button>
          </div>
        </form>

        {message && <p className="username-form__status username-form__status--error" role="alert">{message}</p>}

        {state === 'ready' && (
          <section className="admin-requests" aria-labelledby="admin-requests-heading">
            <div className="admin-requests__header">
              <h2 id="admin-requests-heading">Requests</h2>
              <button className="text-button" type="button" onClick={() => void loadSubmissions()}>Refresh</button>
            </div>
            {submissions.length === 0 ? (
              <p className="admin-empty">No username requests yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <caption className="sr-only">Minecraft username requests</caption>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Username</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">Status</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id}>
                        <th scope="row">{submission.name}</th>
                        <td><code>{submission.username}</code></td>
                        <td>{new Date(submission.submittedAt).toLocaleString()}</td>
                        <td><span className={`admin-status admin-status--${submission.status}`}>{submission.status}</span></td>
                        <td className="admin-table__actions">
                          {submission.status === 'pending' && (
                            <>
                              <button
                                className="text-button text-button--approve"
                                type="button"
                                disabled={busyId === submission.id}
                                onClick={() => void decide(submission.id, 'approve')}
                              >
                                Approve
                              </button>
                              <button
                                className="text-button text-button--reject"
                                type="button"
                                disabled={busyId === submission.id}
                                onClick={() => void decide(submission.id, 'reject')}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
