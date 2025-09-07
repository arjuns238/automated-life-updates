import { useState } from "react";
import { supabase } from "../integrations/supabase/client";

export function useSendMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(groupId: string, content: string) {
    setLoading(true);
    setError(null);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return null;
    }
    const { data, error: dbError } = await supabase
      .from("messages")
      .insert([{ group_id: groupId, user_id: user.id, content }])
      .select()
      .single();
    setLoading(false);
    if (dbError) setError(dbError.message);
    return data;
  }

  return { sendMessage, loading, error };
}