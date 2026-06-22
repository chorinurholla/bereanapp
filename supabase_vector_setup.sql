-- BEREAN — pgvector setup
-- Run this entire block in your Supabase SQL Editor
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste -> Run

-- Step 1: Enable pgvector
create extension if not exists vector;

-- Step 2: Embeddings table
create table if not exists corpus_embeddings (
  id            text primary key,
  book          text not null,
  testament     text not null,
  reference     text not null,
  chapter_title text,
  embedding     vector(1536),
  created_at    timestamptz default now()
);

-- Step 3: Similarity search function
create or replace function match_corpus_chunks(
  query_embedding  vector(1536),
  match_count      int default 10,
  filter_testament text default null
)
returns table (
  id            text,
  book          text,
  testament     text,
  reference     text,
  chapter_title text,
  similarity    float
)
language plpgsql
as $$
begin
  return query
  select
    ce.id,
    ce.book,
    ce.testament,
    ce.reference,
    ce.chapter_title,
    1 - (ce.embedding <=> query_embedding) as similarity
  from corpus_embeddings ce
  where filter_testament is null
     or ce.testament = filter_testament
  order by ce.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Step 4: IVFFlat index (run AFTER embeddings are loaded)
-- create index corpus_embeddings_embedding_idx
--   on corpus_embeddings
--   using ivfflat (embedding vector_cosine_ops)
--   with (lists = 50);
-- NOTE: Uncomment and run the index creation AFTER the embedding script completes.
