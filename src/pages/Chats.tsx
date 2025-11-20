import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PlusCircle,
  Sparkles,
  Users2,
  CalendarDays,
  Search,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

type Group = {
  id: string;
  name: string;
  description: string | null;
  interval?: string | null;
};

const sampleHighlights = [
  "Pick a group to catch up on shared updates",
  "Weekly nudges help everyone chime in",
  "Tap the plus button to start a new chat",
];

export default function Chats() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // create dialog state
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
      .select("id, name, description, interval")
      .order("created_at", { ascending: true });

    if (error) setError(error.message);
    setGroups((data as Group[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!loading && groups.length > 0 && !activeGroupId && !hasAutoSelected) {
      setActiveGroupId(groups[0].id);
      setHasAutoSelected(true);
    }
  }, [groups, loading, activeGroupId, hasAutoSelected]);

  async function handleCreateGroup() {
    if (!newName.trim()) return;

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      return;
    }

    const user = userData.user;
    if (!user) {
      setError("You must be signed in to create a group.");
      return;
    }

    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        name: newName,
        description: newDescription,
        interval: newInterval,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (group) {
      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "owner",
      });
      if (memberError) {
        setError(memberError.message);
        return;
      }

      setGroups((prev) => [...prev, group as Group]);
      setActiveGroupId(group.id);
      setHasAutoSelected(true);
    }

    setNewName("");
    setNewDescription("");
    setNewInterval("weekly");
    setShowCreate(false);
  }

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    return groups.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;

  const readableInterval = (value?: string | null) => {
    if (!value) return "Flexible cadence";
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 pb-24 text-white lg:pb-12">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_top,_rgba(59,130,246,0.25),transparent_45%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_bottom,_rgba(14,165,233,0.15),transparent_40%)]" />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col gap-6 px-4 py-8 lg:h-[calc(100vh-6rem)] lg:flex-row lg:px-6">
        {/* Conversation list */}
        <div
          className={`w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl transition lg:flex ${
            activeGroup ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="space-y-6 border-b border-white/10 px-6 py-8">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Chats</p>
                <h1 className="text-xl font-semibold">Messages</h1>
              </div>
              <Button
                size="sm"
                className="rounded-full bg-white/90 text-slate-900 hover:bg-white"
                onClick={() => setShowCreate(true)}
              >
                <PlusCircle className="mr-1 h-4 w-4" />
                New
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="h-11 rounded-2xl pl-4 pr-12 text-sm text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-6 text-sm text-slate-300">Loading conversations...</div>
            )}
            {error && <div className="p-6 text-sm text-rose-300">{error}</div>}

            {!loading && !error && filteredGroups.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-slate-300">
                <Sparkles className="h-8 w-8 text-white" />
                <p>No chats yet. Create a group to get the convo started.</p>
              </div>
            )}

            <div className="divide-y divide-white/5">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  className={`flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-white/5 ${
                    activeGroupId === group.id ? "bg-white/10" : ""
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-base font-semibold">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{group.name}</span>
                      <span className="text-[11px] font-normal text-slate-300">
                        {readableInterval(group.interval)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-1">
                      {group.description || "No description yet"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat window */}
        <div
          className={`flex w-full flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl transition ${
            activeGroup ? "flex" : "hidden lg:flex"
          }`}
        >
          {activeGroup ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-white/20 text-white hover:bg-white/10 lg:hidden"
                    onClick={() => setActiveGroupId(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <p className="text-sm font-semibold">{activeGroup.name}</p>
                    <p className="text-xs text-slate-300">
                      {readableInterval(activeGroup.interval)} • {activeGroup.description || "Shared recap space"}
                    </p>
                  </div>
                </div>
                <div className="hidden items-center gap-3 text-xs text-slate-200 lg:flex">
                  <span className="inline-flex items-center gap-1">
                    <Users2 className="h-4 w-4" />
                    Crew synced
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {readableInterval(activeGroup.interval)} cadence
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-slate-950/30">
                <GroupChat group={activeGroup} onBack={() => setActiveGroupId(null)} />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center text-slate-200">
              <div className="rounded-full bg-white/10 p-6">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Select a conversation</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Your latest life updates will show up like an iMessage thread—choose a chat to dive in
                  or start a new one to bring friends together.
                </p>
              </div>
              <div className="w-full max-w-md space-y-3 text-left text-sm text-slate-300">
                {sampleHighlights.map((text) => (
                  <Card key={text} className="border-white/10 bg-white/5">
                    <CardContent className="p-4">{text}</CardContent>
                  </Card>
                ))}
              </div>
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
              placeholder="e.g. Weekend Hikers"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="A short blurb for your friends"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Update Interval</label>
            <Select value={newInterval} onValueChange={setNewInterval}>
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

          <DialogFooter>
            <Button onClick={handleCreateGroup} className="bg-blue-500 text-white hover:bg-blue-600">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
