ALTER TABLE public.group_members
DROP CONSTRAINT IF EXISTS fk_group_members_profiles;

ALTER TABLE public.group_members
ADD CONSTRAINT fk_group_members_users
FOREIGN KEY (user_id)
REFERENCES auth.users (id)
ON DELETE CASCADE;
