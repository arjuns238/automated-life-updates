import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GroupChat from "@/components/GroupChat";

export default function Chats() {
  const [groups, setGroups] = useState([
    {
      id: 1,
      name: "Book Lovers 📚",
      interests: ["Fantasy", "Romance"],
      interval: "Weekly",
      messages: [
        { id: 1, sender: "Alice", text: "Hey everyone! 🌸" },
        { id: 2, sender: "Sam", text: "Hi Alice! Excited for book club?" },
      ],
    },
    {
      id: 2,
      name: "Morning Joggers 🏃‍♀️",
      interests: ["Running", "Wellness"],
      interval: "Daily",
      messages: [
        { id: 1, sender: "Taylor", text: "Ran 5 miles today 🚀" },
        { id: 2, sender: "You", text: "Nice!! Keep it up 👏" },
      ],
    },
    {
      id: 3,
      name: "Foodies 🍜",
      interests: ["Cooking", "Restaurants"],
      interval: "Monthly",
      messages: [],
    },
  ]);

  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  const handleCreateGroup = () => {
    const newGroup = {
      id: Date.now(),
      name: "New Group ✨",
      interests: [],
      interval: "Unset",
      messages: [],
    };
    setGroups([...groups, newGroup]);
  };

  const handleSendMessage = (groupId: number, message: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              messages: [
                ...g.messages,
                { id: Date.now(), sender: "You", text: message },
              ],
            }
          : g
      )
    );
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <div className="flex h-screen">
      {/* Left: Group list */}
      <div className="w-1/3 border-r border-blue-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-blue-100">
          <h2 className="text-xl font-bold text-blue-600">Groups 💬</h2>
          <Button
            onClick={handleCreateGroup}
            size="sm"
            className="flex items-center gap-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            <PlusCircle size={18} />
            New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                  <span className="font-medium">Interests:</span>{" "}
                  {group.interests.length > 0
                    ? group.interests.join(", ")
                    : "None yet"}
                </p>
                <p>
                  <span className="font-medium">Interval:</span>{" "}
                  {group.interval}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Right: Summary view OR active chat */}
      <div className="flex-1 overflow-y-auto">
        {activeGroup ? (
          <GroupChat
            group={activeGroup}
            onBack={() => setActiveGroupId(null)}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div className="p-6 space-y-6">
            {/* Upcoming chats */}
            <section>
              <h3 className="text-lg font-semibold text-blue-600 mb-3">
                ⏰ Upcoming Chats
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="rounded-xl border-blue-200">
                  <CardContent className="p-4 text-sm text-gray-700">
                    Book Lovers 📚 — Next update: Friday
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-blue-200">
                  <CardContent className="p-4 text-sm text-gray-700">
                    Morning Joggers 🏃‍♀️ — Next update: Tomorrow
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Recent highlights */}
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
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
