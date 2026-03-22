'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'

interface Email {
  id: string
  sender_email: string
  sender_name: string
  subject: string
  body_text: string
  received_at: string
  status: string
}

interface Draft {
  id: string
  ai_draft: string
}

export default function ReplyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [email, setEmail] = useState<Email | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editedReply, setEditedReply] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && id) {
      Promise.all([
        fetch(`/api/emails/${id}`).then((r) => r.json()),
      ]).then(([emailData]) => {
        setEmail(emailData)
        setLoading(false)
      })
    }
  }, [status, id])

  async function generateDraft() {
    setGenerating(true)
    setError('')
    const res = await fetch(`/api/emails/${id}/draft`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setDraft(data)
      setEditedReply(data.ai_draft)
    } else {
      setError(data.error || 'Failed to generate draft')
    }
    setGenerating(false)
  }

  async function sendReply() {
    if (!draft) return
    setSending(true)
    setError('')
    const res = await fetch(`/api/emails/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: draft.id, sentVersion: editedReply }),
    })
    const data = await res.json()
    if (res.ok) {
      router.push('/dashboard?sent=1')
    } else {
      setError(data.error || 'Failed to send email')
      setSending(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!email) return <div className="p-8 text-gray-400">Email not found.</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push(`/dashboard/email/${id}`)}
          className="text-gray-500 hover:text-gray-800 text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 truncate">
          Reply: {email.subject || '(no subject)'}
        </h1>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Email */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Original Email</h2>
          <div className="mb-3 pb-3 border-b border-gray-100">
            <p className="text-xs text-gray-400">From</p>
            <p className="text-sm font-medium text-gray-900">
              {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}
            </p>
            <p className="text-xs text-gray-400 mt-1">{new Date(email.received_at).toLocaleString()}</p>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {email.body_text || 'No text content.'}
          </div>
        </div>

        {/* AI Draft */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">AI Draft Reply</h2>
            {!draft && (
              <button
                onClick={generateDraft}
                disabled={generating}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {generating ? 'Generating...' : 'Generate Draft'}
              </button>
            )}
          </div>

          {!draft && !generating && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Click &quot;Generate Draft&quot; to create an AI-powered reply using your knowledge base.
            </div>
          )}

          {generating && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Generating reply using RAG + GPT-4o...
            </div>
          )}

          {draft && (
            <>
              <textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                className="flex-1 w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[320px]"
                placeholder="AI draft will appear here..."
              />
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={generateDraft}
                  disabled={generating}
                  className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  onClick={sendReply}
                  disabled={sending || !editedReply.trim()}
                  className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {sending ? 'Sending...' : '\u2713 Approve & Send'}
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
    </main>
  )
}
