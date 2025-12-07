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
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    setGroups(((data as Group[]) ?? []).map((group) => ({
      ...group,
      // normalize ids to strings so selection matching works even if Supabase returns another type
      id: String(group.id),
    })));
    setLoading(false);
  }

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

      const normalizedGroup = {
        ...(group as Group),
        id: String(group.id),
      };
      setGroups((prev) => [...prev, normalizedGroup]);
      setActiveGroupId(normalizedGroup.id);
      setActiveGroup(normalizedGroup);
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

  useEffect(() => {
    if (!activeGroupId) {
      setActiveGroup(null);
      return;
    }
    const found = groups.find((g) => String(g.id) === String(activeGroupId)) || null;
    setActiveGroup(found);
  }, [activeGroupId, groups]);

  const handleSelectGroup = (group: Group) => {
    const normalizedId = String(group.id);
    setActiveGroupId(normalizedId);
    setActiveGroup({ ...group, id: normalizedId });
  };

  const handleBackToList = () => {
    setActiveGroupId(null);
    setActiveGroup(null);
  };

  const readableInterval = (value?: string | null) => {
    if (!value) return "Flexible cadence";
    const lower = value.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const pageWrapperClasses = activeGroup
    ? "relative h-screen min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 pb-0 text-white"
    : "relative min-h-[calc(100vh-5rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 pb-24 text-white lg:pb-12";

  return (
    <div className={pageWrapperClasses}>
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_top,_rgba(59,130,246,0.22),transparent_45%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_bottom,_rgba(14,165,233,0.15),transparent_40%)]" />

      <div
        className={`relative mx-auto flex h-full min-h-0 max-w-full flex-col gap-4 ${
          activeGroup ? "px-0 py-0" : "px-2 py-4"
        } lg:h-[calc(100vh-6rem)] lg:max-w-6xl lg:flex-row lg:px-6 lg:py-8`}
      >
        {/* Conversation list */}
        <div
          className={`w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-2xl transition lg:w-[360px] lg:flex-shrink-0 lg:basis-[360px] ${
            activeGroup ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Messages</p>
              <h1 className="text-lg font-semibold leading-tight">Chats</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setShowCreate(true)}
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-3 border-b border-white/10 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search chats"
                className="h-11 w-full rounded-full border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400"
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
                <p>No chats yet. Start one to bring the crew together.</p>
              </div>
            )}

            <div className="divide-y divide-white/5">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    activeGroupId === group.id ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 opacity-40" />
                    <div className="relative flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="truncate">{group.name}</span>
                      <span className="text-[11px] font-normal text-slate-300">
                        {readableInterval(group.interval)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-1">
                      {group.description || "Shared recap space"}
                    </p>
                  </div>
                  <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-400/80 shadow-[0_0_0_6px_rgba(16,185,129,0.15)]" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat window */}
        <div
          className={`w-full flex-1 flex-col overflow-hidden rounded-none border-0 bg-slate-950 shadow-none transition ${
            activeGroup ? "flex" : "hidden lg:flex"
          } lg:rounded-2xl lg:border lg:border-white/10 lg:bg-white/5 lg:shadow-lg lg:backdrop-blur-2xl h-full min-h-0`}
        >
          {activeGroup ? (
            <GroupChat group={activeGroup} onBack={handleBackToList} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center text-white">
              <div className="rounded-full bg-white/10 p-6">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Select a conversation</h3>
                <p className="mt-2 text-sm text-white">
                  Your latest life updates will show up like an iMessage thread; choose a chat to dive in
                  or start a new one to bring friends together.
                </p>
              </div>
              <div className="w-full max-w-md space-y-3 text-left text-sm text-white">
                {sampleHighlights.map((text) => (
                  <Card
                    key={text}
                    className="border-0 bg-transparent p-0 text-center text-white lg:border lg:border-white/10 lg:bg-white/5"
                  >
                    <CardContent className="p-2 text-center text-white lg:p-4">{text}</CardContent>
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
