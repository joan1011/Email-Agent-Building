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
  body_html: string
  received_at: string
  status: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  drafted: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  ignored: 'bg-gray-100 text-gray-500',
}

export default function EmailDetail() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [email, setEmail] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetch(`/api/emails/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setEmail(data)
          setLoading(false)
        })
    }
  }, [status, id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Email not found.
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-gray-700 transition"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{email.subject || '(no subject)'}</h1>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[email.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {email.status}
        </span>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Sender info */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-semibold">
                {(email.sender_name || email.sender_email)[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">
                {email.sender_name || email.sender_email}
              </p>
              <p className="text-xs text-gray-400">
                {email.sender_name && <span className="mr-2">{email.sender_email}</span>}
                {new Date(email.received_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Email body */}
          <div className="px-6 py-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[200px]">
            {email.body_text || (
              <span className="text-gray-400 italic">No text content available.</span>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600 transition"
          >
            ← Back to inbox
          </button>
          {email.status !== 'sent' && (
            <button
              onClick={() => router.push(`/dashboard/email/${email.id}/reply`)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
            >
              ✦ Generate AI Reply
            </button>
          )}
          {email.status === 'sent' && (
            <span className="text-sm text-green-600 font-medium">✓ Reply sent</span>
          )}
        </div>
      </div>
    </main>
  )
}
