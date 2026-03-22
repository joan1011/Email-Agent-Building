import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

interface CourseRow {
  'Course name': string
  'Course link': string
  'Course description': string
  'Price': string
  'Starting date': string
  'Whether it is live or self-paced': string
  'Number of lessons': string
  'Total duration in number of hours': string
  'Who the course is meant for': string
}

function buildContent(row: CourseRow): string {
  return [
    `Course: ${row['Course name']}`,
    `Description: ${row['Course description']}`,
    `Price: ${row['Price']}`,
    `Format: ${row['Whether it is live or self-paced']}`,
    `Starting date: ${row['Starting date']}`,
    `Lessons: ${row['Number of lessons']}`,
    `Duration: ${row['Total duration in number of hours']} hours`,
    `Meant for: ${row['Who the course is meant for']}`,
    `Link: ${row['Course link']}`,
  ].join('\n')
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const csvPath = path.join(process.cwd(), 'vizuara_courses_dummy_dataset_150.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')

  const rows: CourseRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  })

  console.log(`Found ${rows.length} courses. Generating embeddings...`)

  const BATCH_SIZE = 10

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    const records = await Promise.all(
      batch.map(async (row) => {
        const text = buildContent(row)
        const embeddingRes = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        })
        return {
          course_name: row['Course name'],
          course_link: row['Course link'],
          description: row['Course description'],
          price: parseFloat(row['Price'].replace('$', '')),
          starting_date: row['Starting date'],
          format: row['Whether it is live or self-paced'],
          num_lessons: parseInt(row['Number of lessons']),
          total_hours: parseFloat(row['Total duration in number of hours']),
          target_audience: row['Who the course is meant for'],
          content: text,
          embedding: embeddingRes.data[0].embedding,
        }
      })
    )

    const { error } = await supabase.from('course_embeddings').insert(records)

    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message)
    } else {
      console.log(`Batch ${i / BATCH_SIZE + 1}/${Math.ceil(rows.length / BATCH_SIZE)} inserted (${i + batch.length}/${rows.length} courses)`)
    }

    if (i + BATCH_SIZE < rows.length) await sleep(200)
  }

  console.log('Done! All courses embedded and stored in Supabase.')
}

main().catch(console.error)
