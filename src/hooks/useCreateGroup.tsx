import { useState } from "react";
import { supabase } from "../integrations/supabase/client";

export function useCreateGroup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGroup(name: string) {
    setLoading(true);
    setError(null);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return null;
    }
    const { data, error: dbError } = await supabase
      .from("groups") 
      .insert([{ name, created_by: user.id }])
      .select()
      .single();
    setLoading(false);
    if (dbError) setError(dbError.message);
    return data;
  }

  return { createGroup, loading, error };
}