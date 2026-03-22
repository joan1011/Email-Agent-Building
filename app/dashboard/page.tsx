'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Email {
  id: string
  sender_email: string
  sender_name: string
  subject: string
  body_text: string
  received_at: string
  status: 'pending' | 'drafted' | 'sent' | 'ignored'
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  drafted: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-600',
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') fetchEmails()
  }, [status])

  async function fetchEmails() {
    setLoading(true)
    const res = await fetch('/api/emails')
    if (res.ok) setEmails(await res.json())
    setLoading(false)
  }

  async function syncEmails() {
    setSyncing(true)
    setSyncMsg('')
    const res = await fetch('/api/gmail/sync', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setSyncMsg(`Synced: ${data.inserted} new, ${data.skipped} already stored`)
      fetchEmails()
    } else {
      setSyncMsg(`Error: ${data.error}`)
    }
    setSyncing(false)
  }

  if (status === 'loading') return null

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Vizuara Email Agent</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-800">Inbox</h2>
          <div className="flex items-center gap-3">
            {syncMsg && <span className="text-sm text-gray-500">{syncMsg}</span>}
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {syncing ? 'Syncing...' : 'Sync Inbox'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-16">Loading emails...</div>
        ) : emails.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            No emails yet. Click &quot;Sync Inbox&quot; to fetch from Gmail.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => router.push(`/dashboard/email/${email.id}`)}
                className="flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {email.sender_name || email.sender_email}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(email.received_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{email.subject || '(no subject)'}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {email.body_text?.slice(0, 100)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_STYLES[email.status]}`}
                >
                  {email.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
