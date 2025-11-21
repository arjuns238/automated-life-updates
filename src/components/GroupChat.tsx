import { useCallback, useEffect, useRef, useState } from "react";
import type { User, RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GroupChatProps = {
  group: {
    id: string;
    name: string;
    description: string | null;
  };
  onBack: () => void;
};

type Message = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
};

export default function GroupChat({ group, onBack }: GroupChatProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Ensure membership exists; uses ignoreDuplicates to avoid PK conflicts
  const ensureMembership = useCallback(async () => {
    if (!currentUser?.id || !group?.id) return false;
    const { error: membershipError } = await supabase
      .from("group_members")
      .upsert(
        { group_id: group.id, user_id: currentUser.id, role: "member" },
        { onConflict: "group_id,user_id", ignoreDuplicates: true }
      );
    if (!membershipError) {
      setHasMembership(true);
      return true;
    }
    setHasMembership(false);
    return false;
  }, [currentUser?.id, group?.id]);

  // Make sure we have membership as soon as user/group is known
  useEffect(() => {
    if (!currentUser?.id || !group?.id) return;
    ensureMembership();
  }, [currentUser?.id, group?.id, ensureMembership]);

  // Load messages and subscribe
  useEffect(() => {
    if (!group?.id) return;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, user_id, created_at, profiles(display_name, username, avatar_url)")
        .eq("group_id", group.id)
        .order("created_at", { ascending: true });

      if (!cancelled) {
        if (error) {
          setError(error.message);
          setMessages([]);
        } else {
          setMessages((data as Message[]) ?? []);
        }
        setLoading(false);
      }
    }

    loadMessages();

    channel = supabase
      .channel(`messages-${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${group.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new as Message]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [group?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || !currentUser || sending) return;

    setSending(true);
    setError(null);
    // Make sure we’re allowed to write: ensure membership first
    const ok = hasMembership || (await ensureMembership());
    if (!ok) {
      setSending(false);
      setError("Could not join this chat. Please try again.");
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        group_id: group.id,
        user_id: currentUser.id,
        content,
      })
      .select("id, content, user_id, created_at")
      .single();

    if (error || !data) {
      setError(error?.message || "Could not send message.");
      setSending(false);
      return;
    }

    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]
    );
    setNewMessage("");
    setSending(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950/80 text-white lg:rounded-2xl lg:bg-slate-950/60 lg:border lg:border-white/10 lg:backdrop-blur">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur lg:rounded-t-2xl flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <p className="text-sm font-semibold leading-tight">{group.name}</p>
          <p className="text-xs text-white/70">{group.description || "Shared recap space"}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading && <p className="text-sm text-white/70">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-white/70">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.user_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-xl px-4 py-2 shadow-sm ${
                  isMine
                    ? "bg-blue-600 text-white"
                    : "border border-white/10 bg-white/10 text-white"
                }`}
              >
                {!isMine && (
                  <p className="mb-1 text-[11px] text-white/70">{msg.user_id}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className="mt-1 text-right text-[11px] text-white/70">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 flex-shrink-0 space-y-2 bg-slate-950/95">
        {error && (
          <div className="mx-3 flex items-center gap-2 rounded-md border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-50">
            <AlertTriangle className="h-4 w-4" />
            <span className="truncate">{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-white/10 bg-slate-950/80 px-3 py-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 rounded-full border-white/15 bg-white/5 text-white placeholder:text-slate-400"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            className="rounded-full bg-blue-600 text-white hover:bg-blue-500"
            disabled={sending}
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
