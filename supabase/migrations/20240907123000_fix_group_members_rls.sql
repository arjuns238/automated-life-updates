ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their memberships" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

CREATE POLICY "Members can view their rows"
ON public.group_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Members can join groups"
ON public.group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave groups"
ON public.group_members
FOR DELETE
USING (auth.uid() = user_id);
