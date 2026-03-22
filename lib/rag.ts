import OpenAI from 'openai'
import { supabaseAdmin } from './supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

export async function retrieveRelevantCourses(query: string, matchCount = 5) {
  const queryEmbedding = await embedText(query)

  const { data, error } = await supabaseAdmin.rpc('match_courses', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  })

  if (error) throw new Error(`RAG retrieval failed: ${error.message}`)
  return data
}
