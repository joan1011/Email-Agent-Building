import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { retrieveRelevantCourses } from '@/lib/rag'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Fetch email
  const { data: email, error: emailError } = await supabaseAdmin
    .from('emails')
    .select('*')
    .eq('id', id)
    .single()

  if (emailError || !email) {
    return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  }

  // Check if draft already exists
  const { data: existingDraft } = await supabaseAdmin
    .from('drafts')
    .select('*')
    .eq('email_id', id)
    .single()

  if (existingDraft) {
    return NextResponse.json(existingDraft)
  }

  // RAG: retrieve relevant courses
  const ragQuery = `${email.subject ?? ''} ${email.body_text ?? ''}`.slice(0, 1000)
  const courses = await retrieveRelevantCourses(ragQuery, 5)

  const courseContext = courses
    .map((c: any) =>
      `- ${c.course_name} (${c.format}, $${c.price}, starts ${c.starting_date}): ${c.description} | For: ${c.target_audience} | Link: ${c.course_link}`
    )
    .join('\n')

  // Build prompt
  const systemPrompt = `You are a professional and friendly support agent for Vizuara AI, an online education platform.
Your job is to reply to customer emails about our courses and programs.
Always be helpful, concise, and accurate. Reference specific course details when relevant.
Never make up information. If unsure, invite the customer to reach out for more details.
Sign off as "The Vizuara Team".`

  const userPrompt = `Here is an email you need to reply to:

From: ${email.sender_name || email.sender_email}
Subject: ${email.subject}
Message:
${email.body_text}

---
Relevant courses from our knowledge base:
${courseContext || 'No specific courses found — reply generally about Vizuara AI offerings.'}

---
Write a professional, helpful reply to this email. Be concise (3-5 paragraphs max). Do not include a subject line.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 800,
  })

  const aiDraft = completion.choices[0].message.content ?? ''

  // Store draft
  const { data: draft, error: draftError } = await supabaseAdmin
    .from('drafts')
    .insert({
      email_id: id,
      ai_draft: aiDraft,
    })
    .select()
    .single()

  if (draftError) {
    return NextResponse.json({ error: draftError.message }, { status: 500 })
  }

  // Update email status
  await supabaseAdmin
    .from('emails')
    .update({ status: 'drafted' })
    .eq('id', id)

  return NextResponse.json(draft)
}
