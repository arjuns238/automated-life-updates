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
    <div className="flex h-screen">
      {/* Left: Group list */}
      <div className="w-1/3 border-r border-blue-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-blue-100">
          <h2 className="text-xl font-bold text-blue-600">Groups 💬</h2>
          <Button
            onClick={() => setShowCreate(true)}
            size="sm"
            className="flex items-center gap-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            <PlusCircle size={18} />
            New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && <div className="text-gray-500">Loading groups...</div>}
          {error && <div className="text-red-500">{error}</div>}

          {!loading && !error && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-gray-500 mt-10 space-y-2">
              <p className="text-base font-medium">No group chats yet.</p>
              <p className="text-sm text-gray-400">Start by creating your first group ➕</p>
            </div>
          )}

          {groups.map((group) => (
            <Card
              key={group.id}
              onClick={() => setActiveGroupId(group.id)}
              className={`rounded-xl border-2 border-blue-200 transition cursor-pointer ${
                activeGroupId === group.id ? "bg-blue-50" : "hover:bg-blue-50"
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-blue-700">
                  {group.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Description:</span>{" "}
                  {group.description || "No description yet"}
                </p>
                <p>
                  <span className="font-medium">Interval:</span>{" "}
                  {group.interval || "Unset"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>

      {/* Right: Chat view OR summary */}
     <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {activeGroup ? (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <GroupChat
              group={activeGroup}
              onBack={() => setActiveGroupId(null)}
            />
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6 overflow-y-auto h-full">
          {/* Upcoming Chats */}
          <section>
            <h3 className="text-lg font-semibold text-blue-600 mb-3">
              ⏰ Upcoming Chats
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="rounded-xl border-blue-200">
                <CardContent className="p-4 text-sm text-gray-700">
                  Example Group — Next update: Friday
                </CardContent>
              </Card>
              <Card className="rounded-xl border-blue-200">
                <CardContent className="p-4 text-sm text-gray-700">
                  Another Group — Next update: Tomorrow
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Recent Highlights */}
          <section>
            <h3 className="text-lg font-semibold text-blue-600 mb-3">
              🌟 Recent Highlights
            </h3>
            <div className="space-y-3">
              <Card className="rounded-xl border-blue-200">
                <CardContent className="p-4 text-sm text-gray-700">
                    <strong>Alice</strong> shared a new recipe in{" "}
                    <em>Foodies 🍜</em>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-blue-200">
                <CardContent className="p-4 text-sm text-gray-700">
                    <strong>Sam</strong> finished a half-marathon update in{" "}
                    <em>Morning Joggers 🏃‍♀️</em>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-blue-200">
                <CardContent className="p-4 text-sm text-gray-700">
                  Carol: “Let’s schedule the next game night 🎮” — 1d ago
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}
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
