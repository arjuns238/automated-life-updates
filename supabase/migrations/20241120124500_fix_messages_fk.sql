-- Align messages.user_id FK with auth.users (avoid conflicts when profiles rows are missing)
alter table public.messages
drop constraint if exists messages_user_id_fkey1,
drop constraint if exists messages_user_id_fkey;

alter table public.messages
add constraint messages_user_id_fkey
foreign key (user_id) references auth.users (id) on delete cascade;
