'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
  pending: 'bg-yellow-100 text-yellow-700',
  drafted: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  ignored: 'bg-gray-100 text-gray-500',
}

function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    if (searchParams.get('sent') === '1') {
      setToast('Email sent successfully!')
      setTimeout(() => setToast(''), 4000)
      router.replace('/dashboard')
    }
  }, [searchParams, router])

  const fetchEmails = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/emails')
    if (res.ok) setEmails(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchEmails()
  }, [status, fetchEmails])

  async function syncEmails() {
    setSyncing(true)
    setSyncMsg('')
    const res = await fetch('/api/gmail/sync', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setSyncMsg(`${data.inserted} new email${data.inserted !== 1 ? 's' : ''} synced`)
      fetchEmails()
    } else {
      setSyncMsg(`Error: ${data.error}`)
    }
    setSyncing(false)
  }

  const counts = {
    total: emails.length,
    pending: emails.filter((e) => e.status === 'pending').length,
    drafted: emails.filter((e) => e.status === 'drafted').length,
    sent: emails.filter((e) => e.status === 'sent').length,
  }

  if (status === 'loading') return null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in">
          ✓ {toast}
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">V</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Vizuara Email Agent</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{session?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-sm text-gray-400 hover:text-red-500 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Stats bar */}
        {emails.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total', value: counts.total, color: 'text-gray-700' },
              { label: 'Pending', value: counts.pending, color: 'text-yellow-600' },
              { label: 'Drafted', value: counts.drafted, color: 'text-blue-600' },
              { label: 'Sent', value: counts.sent, color: 'text-green-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Inbox</h2>
          <div className="flex items-center gap-3">
            {syncMsg && <span className="text-xs text-gray-400">{syncMsg}</span>}
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </>
              ) : (
                '↓ Sync Inbox'
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-16 text-center">
            <div className="text-4xl mb-3">📬</div>
            <p className="text-gray-500 font-medium">No emails yet</p>
            <p className="text-gray-400 text-sm mt-1">Click &quot;Sync Inbox&quot; to fetch from Gmail</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => router.push(`/dashboard/email/${email.id}`)}
                className="flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition group"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-indigo-600 text-sm font-semibold">
                    {(email.sender_name || email.sender_email)[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 truncate text-sm">
                      {email.sender_name || email.sender_email}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(email.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{email.subject || '(no subject)'}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {email.body_text?.slice(0, 120)}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${STATUS_STYLES[email.status]}`}>
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

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}
