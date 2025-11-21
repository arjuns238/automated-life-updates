-- Ensure the groups table tracks the creator so we can build RLS policies
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Backfill creator based on existing owner memberships if needed
UPDATE public.groups AS g
SET created_by = gm.user_id
FROM public.group_members AS gm
WHERE gm.group_id = g.id
  AND gm.role = 'owner'
  AND g.created_by IS NULL;

-- Enforce row level security with policies that align with the app behavior
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Groups are visible to members" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups they own" ON public.groups;
DROP POLICY IF EXISTS "Group owners can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group owners can delete groups" ON public.groups;

-- Users can see groups they created or belong to
CREATE POLICY "Groups are visible to members"
ON public.groups
FOR SELECT
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = id
      AND gm.user_id = auth.uid()
  )
);

-- Only allow inserts when the creator matches the authenticated user
CREATE POLICY "Users can create groups they own"
ON public.groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Only owners can update or delete their groups
CREATE POLICY "Group owners can update groups"
ON public.groups
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group owners can delete groups"
ON public.groups
FOR DELETE
USING (auth.uid() = created_by);
