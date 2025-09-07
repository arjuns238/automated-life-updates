import { useState } from "react";
import { supabase } from "../integrations/supabase/client";

export function useJoinGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinGroup(groupId: string) {
    setLoading(true);
    setError(null);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return null;
    }
    const { data, error: dbError } = await supabase
      .from("group_members")
      .insert([{ group_id: groupId, user_id: user.id }])
      .select()
      .single();
    setLoading(false);
    if (dbError) setError(dbError.message);
    return data;
  }

  return { joinGroup, loading, error };
}