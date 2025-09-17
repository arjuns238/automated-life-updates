import { useEffect, useState } from "react";
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

export default function GroupChat({ group, onBack }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [interval, setInterval] = useState(group.interval || "weekly");

  const [members, setMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState("");

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Load messages + realtime subscription
  useEffect(() => {
    if (!group?.id) return;
    let channel: any;

    async function loadMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, user_id, created_at")
        .eq("group_id", group.id)
        .order("created_at");

      if (!error) setMessages(data ?? []);

      channel = supabase
        .channel(`group:${group.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `group_id=eq.${group.id}` },
          (payload) => {
            setMessages((m) => [...m, payload.new]);
          }
        )
        .subscribe();
    }

    loadMessages();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [group?.id]);

  // Load members
  useEffect(() => {
    if (!group?.id) return;

    async function loadMembers() {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id, role")
        .eq("group_id", group.id);

      if (!error) setMembers(data ?? []);
    }
    loadMembers();
  }, [group?.id]);

  async function handleSend() {
    if (!newMessage.trim() || !currentUser) return;
    await supabase.from("messages").insert({
      group_id: group.id,
      user_id: currentUser.id,
      content: newMessage,
    });
    setNewMessage("");
  }

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

  async function handleRemoveMember(userId: string) {
    await supabase.from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", userId);

    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }

  if (!group) {
    return <div>Loading group...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-blue-200 bg-blue-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="rounded-full hover:bg-blue-100"
        >
          <ArrowLeft className="text-blue-600" />
        </Button>
        <h2 className="text-xl font-semibold text-blue-700">{group.name}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInfo(true)}
          className="ml-auto rounded-full hover:bg-blue-100"
        >
          <Info className="text-blue-600" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-blue-50 to-white">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.user_id === currentUser?.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-4 py-2 rounded-2xl max-w-xs shadow-sm ${
                msg.user_id === currentUser?.id
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-blue-200 bg-white flex items-center gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message… ✨"
          className="flex-1 rounded-full"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button
          onClick={handleSend}
          className="rounded-full bg-blue-500 hover:bg-blue-600 text-white p-2"
        >
          <Send size={18} />
        </Button>
      </div>

      {/* Group Info Dialog */}
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
