import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId, starRating, comment } = await req.json()

  if (!draftId || !starRating || starRating < 1 || starRating > 5) {
    return NextResponse.json({ error: 'Invalid feedback data' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('feedback')
    .insert({ draft_id: draftId, star_rating: starRating, comment: comment ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
