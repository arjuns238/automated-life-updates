import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// ---------- Hashtag splitter ----------
function splitHashtags(text: string): { clean: string; tags: string[] } {
  if (!text) return { clean: "", tags: [] };
  const tags = Array.from(new Set((text.match(/#\w+/g) || []).map((t) => t.trim())));
  const clean = text
    .replace(/\s*#\w+\s*/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, tags };
}

// ---------- Media Grid ----------
function MediaGrid({ photos }: { photos: string[] }) {
  const imgs = photos.slice(0, 4);
  if (imgs.length === 0) return null;

  if (imgs.length === 1)
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border bg-muted/10 group">
        <img
          src={imgs[0]}
          alt="attachment 1"
          className="w-full h-auto max-h-[520px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );

  if (imgs.length === 2)
    return (
      <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border bg-muted/10">
        {imgs.map((src, i) => (
          <div key={i} className="relative group">
            <img
              src={src}
              alt={`attachment ${i + 1}`}
              className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
    );

  if (imgs.length === 3)
    return (
      <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border bg-muted/10">
        <div className="relative group">
          <img
            src={imgs[0]}
            alt="attachment 1"
            className="col-span-1 w-full h-[328px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="col-span-1 grid grid-rows-2 gap-1">
          {imgs.slice(1).map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`attachment ${i + 2}`}
                className="w-full h-[163px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border bg-muted/10">
      {imgs.map((src, i) => (
        <div key={i} className="relative group">
          <img
            src={src}
            alt={`attachment ${i + 1}`}
            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ))}
    </div>
  );
}

// ---------- Main Component ----------
export default function GroupChat({ group, onBack }) {
  const [activePanel, setActivePanel] = useState<"updates" | "chat">("chat");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [summaries, setSummaries] = useState<any[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<any | null>(null);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [interval, setInterval] = useState((group?.interval ?? "weekly").toLowerCase());
  const [members, setMembers] = useState<any[]>([]);

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
  }, [group]);

  // ---------- Load members ----------
  useEffect(() => {
    if (!group?.id) return;
    supabase
      .from("group_members")
      .select("user_id, role, profiles(display_name, username, avatar_url)")
      .eq("group_id", group.id)
      .then(({ data, error }) => !error && setMembers(data ?? []));
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
            setMessages((prev) => (prev.some((msg) => msg.id === payload.new.id) ? prev : [...prev, payload.new]));
          }
        )
        .subscribe();
    }

    loadMessages();
    return () => channel && supabase.removeChannel(channel);
  }, [group?.id]);

  // ---------- Load life updates ----------
  useEffect(() => {
    if (!currentUser?.id) return;
    let channel: any;

    async function loadSummaries() {
      const { data } = await supabase
        .from("life_updates")
        .select("id, title, user_summary, ai_summary, photos, user_id, created_at")
        .eq("user_id", currentUser.id)
        .order("created_at");

      setSummaries(data ?? []);

      channel = supabase
        .channel(`life_updates-${currentUser.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "life_updates", filter: `user_id=eq.${currentUser.id}` },
          (payload) => setSummaries((prev) => (prev.some((s) => s.id === payload.new.id) ? prev : [...prev, payload.new]))
        )
        .subscribe();
    }

    loadSummaries();
    return () => channel && supabase.removeChannel(channel);
  }, [currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- Handlers ----------
  async function handleSendMessage() {
    if (!newMessage.trim() || !currentUser) return;
    const content = newMessage;
    setNewMessage("");
    setSelectedSummary(null);
    await supabase.from("messages").insert({
      group_id: group.id,
      user_id: currentUser.id,
      content,
    });
  }

  function handleSelectSummary(summary: any) {
    setSelectedSummary(summary);
    const content = summary.user_summary || summary.ai_summary || "";
    setNewMessage(content);
    setActivePanel("chat");
  }

  if (!group) return <div>Loading group...</div>;

  return (
    <div
      className="flex flex-col h-[calc(100vh-5rem)] bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-blue-200 bg-blue-50">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="text-blue-600" />
        </Button>
        <h2 className="text-xl font-semibold text-blue-700">{name}</h2>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant={activePanel === "updates" ? "default" : "ghost"}
            onClick={() => setActivePanel("updates")}
          >
            Life Updates
          </Button>
          <Button
            size="sm"
            variant={activePanel === "chat" ? "default" : "ghost"}
            onClick={() => setActivePanel("chat")}
          >
            Chat
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full hover:bg-blue-100">
            <Info className="text-blue-600" />
          </Button>
        </div>
      </div>

      {/* Scrollable Panel */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-blue-50 to-white">
        {activePanel === "updates" ? (
          <div className="space-y-4">
            {selectedSummary && (
              <Card
                className="border border-border/60 bg-card/70 backdrop-blur shadow-lg cursor-pointer hover:shadow-xl transition"
                onClick={() => handleSelectSummary(selectedSummary)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={getAvatarUrl(currentUser?.id, currentUser?.user_metadata?.avatar_url)}
                      alt="avatar"
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold leading-none">
                          {currentUser?.user_metadata?.full_name ?? "You"}
                        </CardTitle>
                        <span className="text-xs text-muted-foreground">
                          · {new Date(selectedSummary.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{currentUser?.user_metadata?.username ?? currentUser?.id.slice(0, 6)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pl-14">
                  {(() => {
                    const content = selectedSummary.user_summary || selectedSummary.ai_summary || "";
                    const { clean, tags } = splitHashtags(content);
                    return (
                      <>
                        <p className="text-[15px] leading-relaxed whitespace-pre-line">{clean}</p>
                        {selectedSummary.photos?.length > 0 && <MediaGrid photos={selectedSummary.photos} />}
                        {tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {tags.slice(0, 6).map((t, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-background/60 hover:bg-background transition"
                              >
                                <span className="opacity-70">#</span>
                                <span className="font-medium">{t.replace(/^#/, "")}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
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
              const avatarSize = 8;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isMine ? "justify-end" : "justify-start"} items-end`}
                  style={{ marginTop: sameUserAsPrev ? 2 : 8 }}
                >
                  {!isMine && showAvatar && (
                    <img
                      src={getAvatarUrl(msg.user_id, msg.profiles?.avatar_url)}
                      alt="avatar"
                      className={`w-${avatarSize} h-${avatarSize} rounded-full object-cover`}
                    />
                  )}
                  {!isMine && !showAvatar && <div className={`w-${avatarSize} h-${avatarSize}`} />}
                  <div className={`flex flex-col max-w-md ${isMine ? "items-end" : "items-start"}`}>
                    {!sameUserAsPrev && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`font-medium ${isMine ? "text-blue-600" : "text-gray-800"}`}>
                          {msg.profiles?.display_name ?? "Unknown"}
                        </span>
                        <span className="text-gray-400 text-sm">@{msg.profiles?.username ?? msg.user_id.slice(0, 6)}</span>
                        <span className="text-gray-400 text-xs">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl shadow-sm text-sm ${
                        isMine ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                  {isMine && showAvatar && (
                    <img
                      src={getAvatarUrl(msg.user_id, msg.profiles?.avatar_url)}
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

      {/* Fixed Bottom Input / Dropdown */}
      <div className="sticky bottom-0 w-full p-4 border-t border-blue-200 bg-white flex items-center gap-2">
        {activePanel === "chat" ? (
          <>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message… ✨"
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button onClick={handleSendMessage}>
              <Send size={18} />
            </Button>
          </>
        ) : (
          <Select
            onValueChange={(value) => {
              if (value === "new") {
                window.location.href = "/life-updates";
              } else {
                const selected = summaries.find((s) => s.id === value);
                if (selected) handleSelectSummary(selected);
              }
            }}
            className="w-full"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a life update… 🌱" />
            </SelectTrigger>
            <SelectContent>
              {summaries.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title} · {new Date(s.created_at).toLocaleDateString()}
                </SelectItem>
              ))}
              <SelectItem value="new">+ Write a new life update</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
