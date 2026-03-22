-- Enable pgvector
create extension if not exists vector;

-- Emails table
create table if not exists emails (
  id               uuid primary key default gen_random_uuid(),
  gmail_message_id text unique not null,
  gmail_thread_id  text not null,
  sender_email     text not null,
  sender_name      text,
  subject          text,
  body_text        text,
  body_html        text,
  received_at      timestamptz not null,
  status           text not null default 'pending'
    check (status in ('pending', 'drafted', 'sent', 'ignored')),
  created_at       timestamptz default now()
);

-- Drafts table
create table if not exists drafts (
  id                    uuid primary key default gen_random_uuid(),
  email_id              uuid not null references emails(id) on delete cascade,
  ai_draft              text not null,
  sent_version          text,
  sent_at               timestamptz,
  gmail_sent_message_id text,
  created_at            timestamptz default now()
);

-- Feedback table
create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  draft_id    uuid not null references drafts(id) on delete cascade,
  star_rating smallint not null check (star_rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now()
);

-- Course embeddings (RAG)
create table if not exists course_embeddings (
  id              uuid primary key default gen_random_uuid(),
  course_name     text not null,
  course_link     text,
  description     text,
  price           numeric,
  starting_date   date,
  format          text,
  num_lessons     int,
  total_hours     numeric,
  target_audience text,
  content         text not null,
  embedding       vector(1536),
  created_at      timestamptz default now()
);

-- ANN index for fast similarity search
create index if not exists course_embeddings_embedding_idx
  on course_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RAG retrieval function
create or replace function match_courses(
  query_embedding vector(1536),
  match_count     int default 5
)
returns table (
  id              uuid,
  course_name     text,
  course_link     text,
  description     text,
  price           numeric,
  starting_date   date,
  format          text,
  target_audience text,
  similarity      float
)
language sql stable as $$
  select
    id, course_name, course_link, description,
    price, starting_date, format, target_audience,
    1 - (embedding <=> query_embedding) as similarity
  from course_embeddings
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Row Level Security
alter table emails            enable row level security;
alter table drafts            enable row level security;
alter table feedback          enable row level security;
alter table course_embeddings enable row level security;

create policy "authenticated users only" on emails
  for all using (auth.role() = 'authenticated');
create policy "authenticated users only" on drafts
  for all using (auth.role() = 'authenticated');
create policy "authenticated users only" on feedback
  for all using (auth.role() = 'authenticated');
create policy "authenticated users only" on course_embeddings
  for all using (auth.role() = 'authenticated');
