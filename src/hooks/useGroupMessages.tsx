import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

export function useGroupMessages(groupId: string) {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!groupId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, user:auth.users(email)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    const subscription = supabase
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