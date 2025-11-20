import { useEffect, useState, useRef } from "react";
import type { User, RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { ArrowLeft, Send, Info, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Utility for swipe detection
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 50) onSwipeRight();
    if (diff < -50) onSwipeLeft();
    touchStartX.current = null;
  }

  return { handleTouchStart, handleTouchEnd };
}

type GroupMember = {
  user_id: string;
  role: string | null;
};

type GroupMessage = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
};

type GroupChatProps = {
  group: {
    id: string;
    name: string;
    description: string | null;
    interval?: string | null;
  };
  onBack: () => void;
};

export default function GroupChat({ group, onBack }: GroupChatProps) {
  const [activePanel, setActivePanel] = useState<"updates" | "chat">("chat");

  // chat states
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // life updates states
  const [lifeUpdates, setLifeUpdates] = useState<Tables<"life_updates">[]>([]);
  const [newUpdate, setNewUpdate] = useState("");

  // group info states
  const [showInfo, setShowInfo] = useState(false);
  // initialize local editable fields from the incoming `group` prop
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  // normalize interval to lowercase values used elsewhere (e.g. 'weekly')
  const [interval, setInterval] = useState((group?.interval ?? "weekly").toLowerCase());
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMember, setNewMember] = useState("");
  // Load members
  useEffect(() => {
    if (!group?.id) return;
    async function loadMembers() {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, role")
        .eq("group_id", group.id);
      if (!error) setMembers((data as GroupMember[]) ?? []);
    }
    loadMembers();
  }, [group?.id]);

  // Keep local editable state in sync when the `group` prop changes (e.g. user navigates to another group)
  useEffect(() => {
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setInterval((group?.interval ?? "weekly").toLowerCase());
  }, [group?.id, group?.name, group?.description, group?.interval]);

  async function handleSaveGroup() {
    await supabase
      .from("groups")
      .update({ name, description, interval })
      .eq("id", group.id);
    setShowInfo(false);
  }

  async function handleAddMember() {
    if (!newMember.trim()) return;
    // Example: look up user by email in your `auth.users`
    const { data, error } = await supabase.rpc("get_user_by_email", { email: newMember });
    if (error || !data) {
      alert("No user found with that email.");
      return;
    }
    await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: data.id,
    });
    setNewMember("");
    setMembers((prev) => [...prev, { user_id: data.id, role: "member" }]);
  }

  async function handleRemoveMember(userId) {
    await supabase.from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", userId);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Load + subscribe to messages
  useEffect(() => {
    if (!group?.id) return;
    let channel: RealtimeChannel | null = null;

    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("id, content, user_id, created_at")
        .eq("group_id", group.id)
        .order("created_at");

      setMessages((data as GroupMessage[] | null) ?? []);

      channel = supabase
        .channel(`group-${group.id}`)
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
              prev.some((msg) => msg.id === payload.new.id)
                ? prev
                : [...prev, payload.new]
            );
          }
        )
        .subscribe();
    }

    loadMessages();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [group?.id]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load + subscribe to life updates (same source as timeline; scoped by user_id because life_updates has no group_id)
  useEffect(() => {
    if (!currentUser?.id) return;
    let channel: RealtimeChannel | null = null;

    async function loadLifeUpdates() {
      const { data, error } = await supabase
        .from("life_updates")
        .select("id, created_at, title, ai_summary, user_summary, photos, user_id")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: true });

      if (!error) setLifeUpdates((data as Tables<"life_updates">[] | null) ?? []);
    }

    loadLifeUpdates();

    channel = supabase
      .channel(`life-updates-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "life_updates",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setLifeUpdates((prev) =>
            prev.some((u) => u.id === payload.new.id)
              ? prev
              : [...prev, payload.new as Tables<"life_updates">]
          );
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Send message
  async function handleSendMessage() {
    const content = newMessage.trim();
    if (!content || !currentUser) return;
    setNewMessage("");
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
      setNewMessage(content);
      return;
    }

    setMessages((prev) =>
      prev.some((msg) => msg.id === data.id) ? prev : [...prev, data as GroupMessage]
    );
  }

  // Send life update (stored in life_updates to match timeline)
  async function handleSendUpdate() {
    const content = newUpdate.trim();
    if (!content || !currentUser) return;
    setNewUpdate("");
    const { data, error } = await supabase
      .from("life_updates")
      .insert({
        title: "Update",
        user_summary: content,
        user_id: currentUser.id,
      })
      .select("id, created_at, title, ai_summary, user_summary, photos, user_id")
      .single();

    if (error || !data) {
      setNewUpdate(content);
      return;
    }

    setLifeUpdates((prev) =>
      prev.some((u) => u.id === data.id) ? prev : [...prev, data as Tables<"life_updates">]
    );
  }

  // Swipe support
  const { handleTouchStart, handleTouchEnd } = useSwipe(
    () => setActivePanel("chat"),
    () => setActivePanel("updates")
  );

  const readableInterval = (value?: string | null) => {
    if (!value) return "Flexible cadence";
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  if (!group) return <div>Loading group...</div>;

  return (
    <div
      className="flex h-full min-h-[70vh] flex-col bg-slate-950/60 text-slate-50"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-3">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold leading-tight">{name}</h2>
          <span className="text-[11px] text-slate-300">
            {readableInterval(group.interval)} · {group.description || "Shared recap space"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant={activePanel === "updates" ? "secondary" : "ghost"}
            className="rounded-full border border-white/15 bg-white/5 text-xs text-white hover:bg-white/10"
            onClick={() => setActivePanel("updates")}
          >
            Updates
          </Button>
          <Button
            size="sm"
            variant={activePanel === "chat" ? "secondary" : "ghost"}
            className="rounded-full border border-white/15 bg-white/5 text-xs text-white hover:bg-white/10"
            onClick={() => setActivePanel("chat")}
          >
            Chat
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowInfo(true)}
            className="rounded-full border border-white/15 text-white hover:bg-white/10"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {activePanel === "updates" ? (
          <div className="space-y-3">
            {lifeUpdates.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-amber-200/10 bg-white/5 px-3 py-3 shadow-inner shadow-black/20"
              >
                <p className="text-[11px] font-semibold text-amber-100/80">{u.title || "Update"}</p>
                <p className="text-sm text-amber-50/90 mt-1">
                  {u.ai_summary || u.user_summary || "No summary provided"}
                </p>
                <p className="mt-1 text-right text-[11px] text-amber-100/70">
                  {new Date(u.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.user_id === currentUser?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-xl px-4 py-2 shadow-sm ${
                      isMine
                        ? "bg-blue-600 text-white"
                        : "border border-white/10 bg-white/10 text-slate-50"
                    }`}
                  >
                    {!isMine && (
                      <p className="mb-1 text-[11px] text-slate-300/80">{msg.user_id}</p>
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
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-slate-950/80 px-3 py-3">
        {activePanel === "updates" ? (
          <>
            <Input
              value={newUpdate}
              onChange={(e) => setNewUpdate(e.target.value)}
              placeholder="Share a new update…"
              onKeyDown={(e) => e.key === "Enter" && handleSendUpdate()}
              className="flex-1 rounded-full border-white/15 bg-white/5 text-white placeholder:text-slate-400"
            />
            <Button
              onClick={handleSendUpdate}
              className="rounded-full bg-blue-600 text-white hover:bg-blue-500"
            >
              <Send size={18} />
            </Button>
          </>
        ) : (
          <>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 rounded-full border-white/15 bg-white/5 text-white placeholder:text-slate-400"
            />
            <Button
              onClick={handleSendMessage}
              className="rounded-full bg-blue-600 text-white hover:bg-blue-500"
            >
              <Send size={18} />
            </Button>
          </>
        )}
      </div>

      {/* Group Info Dialog (restored with editing and member management) */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          {/* Editable fields */}
          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Update Interval</Label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Members */}
          <div className="space-y-2">
            <Label>Members</Label>
            <ul className="space-y-1">
              {members.map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded-md"
                >
                  <span>{m.user_id}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveMember(m.user_id)}
                  >
                    <X size={14} className="text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-2">
              <Input
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                placeholder="Enter user email"
              />
              <Button size="sm" onClick={handleAddMember}>
                <UserPlus size={16} />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSaveGroup}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
