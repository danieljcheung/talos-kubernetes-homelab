import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import AdminDashboard from './AdminDashboard'

const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch')

function setFetch(fetchImplementation: typeof fetch) {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: fetchImplementation
  })
}

afterEach(() => {
  if (fetchDescriptor) {
    Object.defineProperty(globalThis, 'fetch', fetchDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'fetch')
  }
})

describe('Admin dashboard', () => {
  test('loads with a bearer token and approves a pending request', async () => {
    const pendingSubmission = {
      id: 42,
      username: 'BirchBuilder',
      status: 'pending' as const,
      submittedAt: '2026-08-11T10:00:00.000Z',
      decidedAt: null
    }
    const approvedSubmission = {
      ...pendingSubmission,
      status: 'approved' as const,
      decidedAt: '2026-08-11T10:05:00.000Z'
    }
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([pendingSubmission]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(approvedSubmission), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
    setFetch(fetchMock)
    render(<AdminDashboard />)

    fireEvent.change(screen.getByLabelText('Admin token'), {
      target: { value: 'field-notes-token' }
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Load requests' }))
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/admin/submissions', {
      headers: { Authorization: 'Bearer field-notes-token' }
    })
    expect(screen.getByText('BirchBuilder')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    })

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/submissions/42/approve', {
      method: 'POST',
      headers: { Authorization: 'Bearer field-notes-token' }
    })
    expect(screen.getByText('approved')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
})
