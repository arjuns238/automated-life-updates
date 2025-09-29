import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
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

// ---------- Helper for swipe detection ----------
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

// ---------- Helper for avatars ----------
function getAvatarUrl(userId: string, avatarUrl?: string) {
  return avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}`;
}

// ---------- Main Component ----------
export default function GroupChat({ group, onBack }) {
  const [activePanel, setActivePanel] = useState<"updates" | "chat">("chat");

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [summaries, setSummaries] = useState<any[]>([]);
  const [newSummary, setNewSummary] = useState("");

  const [showInfo, setShowInfo] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [interval, setInterval] = useState((group?.interval ?? "weekly").toLowerCase());
  const [members, setMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState("");

  const { handleTouchStart, handleTouchEnd } = useSwipe(
    () => setActivePanel("chat"),
    () => setActivePanel("updates")
  );

  // ---------- Load current user ----------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // ---------- Load group info ----------
  useEffect(() => {
    setName(group?.name ?? "");
    setDescription(group?.description ?? "");
    setInterval((group?.interval ?? "weekly").toLowerCase());
  }, [group?.id, group?.name, group?.description, group?.interval]);

  // ---------- Load members with profiles ----------
  useEffect(() => {
    if (!group?.id) return;
    async function loadMembers() {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, role, profiles(display_name, username, avatar_url)")
        .eq("group_id", group.id);
      if (!error) setMembers(data ?? []);
    }
    loadMembers();
  }, [group?.id]);

  // ---------- Load messages ----------
  useEffect(() => {
    if (!group?.id) return;
    let channel: any;

    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("id, content, user_id, created_at, profiles(display_name, username, avatar_url)")
        .eq("group_id", group.id)
        .order("created_at");

      setMessages(data ?? []);

      channel = supabase
        .channel(`group-${group.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${group.id}` },
          (payload) => {
            setMessages((prev) =>
              prev.some((msg) => msg.id === payload.new.id) ? prev : [...prev, payload.new]
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

  // ---------- Load summaries ----------
  useEffect(() => {
    if (!group?.id) return;
    let channel: any;

    async function loadSummaries() {
      const { data } = await supabase
        .from("summaries")
        .select("id, content, user_id, created_at, profiles(display_name, username, avatar_url)")
        .eq("group_id", group.id)
        .order("created_at");

      setSummaries(data ?? []);

      channel = supabase
        .channel(`summaries-${group.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "summaries", filter: `group_id=eq.${group.id}` },
          (payload) => {
            setSummaries((prev) =>
              prev.some((s) => s.id === payload.new.id) ? prev : [...prev, payload.new]
            );
          }
        )
        .subscribe();
    }

    loadSummaries();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [group?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- Handlers ----------
  async function handleSaveGroup() {
    await supabase
      .from("groups")
      .update({ name, description, interval })
      .eq("id", group.id);
    setShowInfo(false);
  }

  async function handleAddMember() {
    if (!newMember.trim()) return;
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
    setMembers((prev) => [...prev, { user_id: data.id, role: "member", profiles: data }]);
  }

  async function handleRemoveMember(userId: string) {
    await supabase.from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", userId);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !currentUser) return;
    setNewMessage("");
    await supabase.from("messages").insert({
      group_id: group.id,
      user_id: currentUser.id,
      content: newMessage,
    });
  }

  async function handleSendSummary() {
    if (!newSummary.trim() || !currentUser) return;
    setNewSummary("");
    await supabase.from("summaries").insert({
      group_id: group.id,
      user_id: currentUser.id,
      content: newSummary,
    });
  }

  if (!group) return <div>Loading group...</div>;

  // ---------- Render ----------
  return (
    <div className="flex flex-col h-screen" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-blue-200 bg-blue-50">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="text-blue-600" />
        </Button>
        <h2 className="text-xl font-semibold text-blue-700">{name}</h2>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant={activePanel === "updates" ? "default" : "ghost"} onClick={() => setActivePanel("updates")}>Life Updates</Button>
          <Button size="sm" variant={activePanel === "chat" ? "default" : "ghost"} onClick={() => setActivePanel("chat")}>Chat</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowInfo(true)} className="rounded-full hover:bg-blue-100">
            <Info className="text-blue-600" />
          </Button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-blue-50 to-white">
        {activePanel === "updates" ? (
          <div className="space-y-3">
            {summaries.map((s) => (
              <div key={s.id} className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <img src={getAvatarUrl(s.user_id, s.profiles?.avatar_url)} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                  <span className="text-sm font-medium text-gray-700">
                    {s.profiles?.display_name ?? "Unknown"}{" "}
                    <span className="text-gray-400 text-xs">@{s.profiles?.username ?? s.user_id.slice(0, 6)}</span>
                  </span>
                </div>
                <p className="text-sm">{s.content}</p>
                <p className="text-xs text-gray-400 mt-1 text-right">{new Date(s.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {messages.map((msg, i) => {
              const isMine = msg.user_id === currentUser?.id;
              const prevMsg = messages[i - 1];
              const nextMsg = messages[i + 1];
              const sameUserAsPrev = prevMsg && prevMsg.user_id === msg.user_id;
              const sameUserAsNext = nextMsg && nextMsg.user_id === msg.user_id;

              const showAvatar = !sameUserAsNext;
              const avatarSize = 8; // Tailwind units (2rem)

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isMine ? "justify-end" : "justify-start"} items-end`}
                  style={{ marginTop: sameUserAsPrev ? 2 : 8 }}
                >
                  {/* Left side */}
                  {!isMine && showAvatar && (
                    <img
                      src={getAvatarUrl(msg.user_id, msg.profiles?.avatar_url)}
                      alt="avatar"
                      className={`w-${avatarSize} h-${avatarSize} rounded-full object-cover`}
                    />
                  )}
                  {!isMine && !showAvatar && <div className={`w-${avatarSize} h-${avatarSize}`} />}

                  {/* Message bubble */}
                  <div className={`flex flex-col max-w-md ${isMine ? "items-end" : "items-start"}`}>
                    {!sameUserAsPrev && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`font-medium ${isMine ? "text-blue-600" : "text-gray-800"}`}>{msg.profiles?.display_name ?? "Unknown"}</span>
                        <span className="text-gray-400 text-sm">@{msg.profiles?.username ?? msg.user_id.slice(0, 6)}</span>
                        <span className="text-gray-400 text-xs">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                    <div className={`px-4 py-2 rounded-2xl shadow-sm text-sm ${isMine ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}`}>
                      {msg.content}
                    </div>
                  </div>

                  {/* Right side */}
                  {isMine && showAvatar && (
                    <img
                      src={getAvatarUrl(currentUser?.id, currentUser?.user_metadata?.avatar_url)}
                      alt="avatar"
                      className={`w-${avatarSize} h-${avatarSize} rounded-full object-cover`}
                    />
                  )}
                  {isMine && !showAvatar && <div className={`w-${avatarSize} h-${avatarSize}`} />}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-blue-200 bg-white flex items-center gap-2">
        {activePanel === "updates" ? (
          <>
            <Input value={newSummary} onChange={(e) => setNewSummary(e.target.value)} placeholder="Write a new update… 🌱" onKeyDown={(e) => e.key === "Enter" && handleSendSummary()} />
            <Button onClick={handleSendSummary}><Send size={18} /></Button>
          </>
        ) : (
          <>
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message… ✨" onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} />
            <Button onClick={handleSendMessage}><Send size={18} /></Button>
          </>
        )}
      </div>

      {/* Group Info Dialog */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
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
              <SelectTrigger><SelectValue placeholder="Select interval" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Biweekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Members</Label>
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded-md">
                  <div className="flex items-center gap-2">
                    <img src={getAvatarUrl(m.user_id, m.profiles?.avatar_url)} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                    <span>{m.profiles?.display_name ?? "Unknown"} <span className="text-gray-400">@{m.profiles?.username}</span></span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveMember(m.user_id)}><X size={14} className="text-red-500" /></Button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-2">
              <Input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Enter user email" />
              <Button size="sm" onClick={handleAddMember}><UserPlus size={16} /></Button>
            </div>
          </div>
          <Button onClick={handleSaveGroup} className="bg-blue-500 text-white hover:bg-blue-600">Save Changes</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
