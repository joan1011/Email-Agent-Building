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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl transition-colors"
        >
          <span className={(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  )
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

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false)
  const [sentDraftId, setSentDraftId] = useState('')
  const [starRating, setStarRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetch(`/api/emails/${id}`)
        .then((r) => r.json())
        .then((emailData) => {
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
      setSentDraftId(draft.id)
      setShowFeedback(true)
    } else {
      setError(data.error || 'Failed to send email')
    }
    setSending(false)
  }

  async function submitFeedback() {
    if (starRating === 0) return
    setSubmittingFeedback(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: sentDraftId, starRating, comment }),
    })
    router.push('/dashboard')
  }

  function skipFeedback() {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Email not found.</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Email sent!</h2>
            <p className="text-gray-500 text-sm mb-6">How would you rate the AI-generated draft?</p>

            <div className="mb-4">
              <StarRating value={starRating} onChange={setStarRating} />
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional: any feedback on the draft quality..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 mb-6"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={skipFeedback}
                className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2"
              >
                Skip
              </button>
              <button
                onClick={submitFeedback}
                disabled={starRating === 0 || submittingFeedback}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push(`/dashboard/email/${id}`)}
          className="text-gray-500 hover:text-gray-800 text-sm"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 truncate">
          Reply: {email.subject || '(no subject)'}
        </h1>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Email */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Original Email</h2>
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs text-gray-400">From</p>
            <p className="text-sm font-medium text-gray-900">
              {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}
            </p>
            <p className="text-xs text-gray-400 mt-1">{new Date(email.received_at).toLocaleString()}</p>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
            {email.body_text || 'No text content.'}
          </div>
        </div>

        {/* AI Draft */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">AI Draft Reply</h2>
            {!draft && !generating && (
              <button
                onClick={generateDraft}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
              >
                Generate Draft
              </button>
            )}
          </div>

          {!draft && !generating && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 text-sm gap-3 py-12">
              <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p>Click &quot;Generate Draft&quot; to create an AI-powered reply using your course knowledge base.</p>
            </div>
          )}

          {generating && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 text-sm gap-3 py-12">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p>Searching knowledge base and generating reply with GPT-4o...</p>
            </div>
          )}

          {draft && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">AI Generated</span>
                <span className="text-xs text-gray-400">Edit below before sending</span>
              </div>
              <textarea
                value={editedReply}
                onChange={(e) => setEditedReply(e.target.value)}
                className="flex-1 w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[320px]"
              />
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={generateDraft}
                  disabled={generating}
                  className="text-sm text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
                >
                  ↻ Regenerate
                </button>
                <button
                  onClick={sendReply}
                  disabled={sending || !editedReply.trim()}
                  className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    '✓ Approve & Send'
                  )}
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
