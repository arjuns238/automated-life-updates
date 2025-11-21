import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../integrations/supabase/client";

type GroupMessage = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user?: { email: string | null } | null;
};

export function useGroupMessages(groupId: string) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);

  useEffect(() => {
    if (!groupId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, user:auth.users(email)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      setMessages((data as GroupMessage[] | null) || []);
    };
    fetchMessages();

    const subscription: RealtimeChannel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [groupId]);

  return messages;
}
