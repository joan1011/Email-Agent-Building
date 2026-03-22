import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchInboxEmails } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await auth()
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const emails = await fetchInboxEmails(session.accessToken, 20)

    let inserted = 0
    let skipped = 0

    for (const email of emails) {
      const { error } = await supabaseAdmin
        .from('emails')
        .insert({
          gmail_message_id: email.gmailMessageId,
          gmail_thread_id: email.gmailThreadId,
          sender_email: email.senderEmail,
          sender_name: email.senderName,
          subject: email.subject,
          body_text: email.bodyText,
          body_html: email.bodyHtml,
          received_at: email.receivedAt.toISOString(),
          status: 'pending',
        })

      if (error) {
        if (error.code === '23505') {
          skipped++ // duplicate, already stored
        } else {
          console.error('Insert error:', error.message)
        }
      } else {
        inserted++
      }
    }

    return NextResponse.json({ inserted, skipped, total: emails.length })
  } catch (err: any) {
    console.error('Gmail sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
