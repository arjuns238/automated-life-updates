-- This is the SQL executed in Supabase to set up the database schema for group chats.

-- Groups table
create table groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  interval text,
  created_at timestamp default now()
);

-- Group members (user to group many-to-many)
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  primary key (group_id, user_id)
);

-- Messages
create table messages (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp default now()
);
