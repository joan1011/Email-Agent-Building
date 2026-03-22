import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendGmailReply } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { draftId, sentVersion } = await req.json()

  // Fetch email
  const { data: email, error: emailError } = await supabaseAdmin
    .from('emails')
    .select('*')
    .eq('id', id)
    .single()

  if (emailError || !email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  // Send via Gmail
  const sentMessageId = await sendGmailReply(
    session.accessToken as string,
    email.sender_email,
    email.subject ?? '',
    sentVersion,
    email.gmail_thread_id
  )

  // Update draft
  await supabaseAdmin
    .from('drafts')
    .update({
      sent_version: sentVersion,
      sent_at: new Date().toISOString(),
      gmail_sent_message_id: sentMessageId,
    })
    .eq('id', draftId)

  // Update email status
  await supabaseAdmin
    .from('emails')
    .update({ status: 'sent' })
    .eq('id', id)

  return NextResponse.json({ success: true, sentMessageId })
}
