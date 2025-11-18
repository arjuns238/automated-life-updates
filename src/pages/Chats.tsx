import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GroupChat from "@/components/GroupChat";
import { Sparkles, Radio } from "lucide-react";

export default function Chats() {
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // popup state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newInterval, setNewInterval] = useState("weekly");

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, description, interval");
    if (error) setError(error.message);
    setGroups(data ?? []);
    setLoading(false);
  }

  async function handleCreateGroup() {
    if (!newName.trim()) return;

    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        name: newName,
        description: newDescription,
        interval: newInterval,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (group) {
      // add creator as member
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("group_members").insert({
          group_id: group.id,
          user_id: user.id,
          role: "owner",
        });
      }

      setGroups((prev) => [...prev, group]);
      setActiveGroupId(group.id);
    }

    // reset
    setNewName("");
    setNewDescription("");
    setNewInterval("weekly");
    setShowCreate(false);
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_25%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#ffffff0f_1px,transparent_0)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex h-[calc(100vh-5rem)] max-w-6xl gap-6 px-6 py-10">
        {/* Left: Group list */}
        <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 text-slate-100">
              <Radio className="h-4 w-4 text-green-300" />
              <h2 className="text-lg font-semibold">Groups</h2>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 text-white shadow-glow hover:shadow-blue-500/40"
            >
              <PlusCircle size={18} />
              New
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loading && <div className="text-slate-400">Loading groups...</div>}
            {error && <div className="text-rose-400">{error}</div>}

            {!loading && !error && groups.length === 0 && (
              <div className="mt-10 flex flex-col items-center justify-center space-y-2 text-center text-slate-400">
                <p className="text-base font-medium text-white/80">No group chats yet.</p>
                <p className="text-sm text-slate-400">Start by creating your first group ➕</p>
              </div>
            )}

            {groups.map((group) => (
              <Card
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`cursor-pointer rounded-xl border border-white/10 bg-white/5 transition hover:-translate-y-[2px] hover:shadow-xl ${
                  activeGroupId === group.id
                    ? "border-blue-400/50 bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-blue-600/10 shadow-blue-900/30"
                    : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-white">
                    {group.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-slate-300">
                  <p className="line-clamp-2">
                    <span className="font-medium text-slate-200">Description:</span>{" "}
                    {group.description || "No description yet"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-200">Interval:</span>{" "}
                    {group.interval ? group.interval.charAt(0).toUpperCase() + group.interval.slice(1) : "Unset"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Chat view OR summary */}
        <div className="flex w-full flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          {activeGroup ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-blue-200" />
                  <h3 className="text-lg font-semibold">{activeGroup.name}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => setActiveGroupId(null)}
                >
                  Back to groups
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <GroupChat
                  group={activeGroup}
                  onBack={() => setActiveGroupId(null)}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
                  <Radio className="h-4 w-4 text-green-300" />
                  Live rooms available
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => setShowCreate(true)}
                >
                  Start a new chat
                </Button>
              </div>

              <section>
                <h3 className="mb-3 text-lg font-semibold text-white">⏰ Upcoming Chats</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="rounded-xl border-white/10 bg-white/5">
                    <CardContent className="p-4 text-sm text-slate-200">
                      Example Group — Next update: Friday
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl border-white/10 bg-white/5">
                    <CardContent className="p-4 text-sm text-slate-200">
                      Another Group — Next update: Tomorrow
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-lg font-semibold text-white">🌟 Recent Highlights</h3>
                <div className="space-y-3">
                  <Card className="rounded-xl border-white/10 bg-white/5">
                    <CardContent className="p-4 text-sm text-slate-200">
                      <strong className="text-white">Alice</strong> shared a new recipe in{" "}
                      <em className="text-slate-300">Foodies 🍜</em>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl border-white/10 bg-white/5">
                    <CardContent className="p-4 text-sm text-slate-200">
                      <strong className="text-white">Sam</strong> finished a half-marathon update in{" "}
                      <em className="text-slate-300">Morning Joggers 🏃‍♀️</em>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl border-white/10 bg-white/5">
                    <CardContent className="p-4 text-sm text-slate-200">
                      Carol: “Let’s schedule the next game night 🎮” — 1d ago
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Weekend Hikers 🥾"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What’s this group about?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Update Interval</label>
            <Select value={newInterval} onValueChange={setNewInterval}>
              <SelectTrigger>
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Weekly">Weekly</SelectItem>
                <SelectItem value="Biweekly">Biweekly</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreateGroup}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
