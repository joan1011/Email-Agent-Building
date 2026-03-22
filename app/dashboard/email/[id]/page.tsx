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

export default function EmailDetail() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [email, setEmail] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && params.id) {
      fetch(`/api/emails/${params.id}`)
        .then((r) => r.json())
        .then((data) => {
          setEmail(data)
          setLoading(false)
        })
    }
  }, [status, params.id])

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!email) return <div className="p-8 text-gray-400">Email not found.</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-500 hover:text-gray-800 text-sm"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 truncate">{email.subject || '(no subject)'}</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-4 border-b border-gray-100 pb-4">
            <p className="text-sm text-gray-500">From</p>
            <p className="font-medium text-gray-900">
              {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(email.received_at).toLocaleString()}
            </p>
          </div>
          <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
            {email.body_text || 'No text content available.'}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => router.push(`/dashboard/email/${email.id}/reply`)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Generate AI Reply
          </button>
        </div>
      </div>
    </main>
  )
}
