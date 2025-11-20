-- Add missing summaries table used by GroupChat life updates view
create table if not exists public.summaries (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Helpful index for group filtering
create index if not exists summaries_group_id_idx on public.summaries (group_id, created_at);
