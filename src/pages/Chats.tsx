import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Chats() {
  const [groups, setGroups] = useState([
    {
      id: 1,
      name: "Book Lovers 📚",
      interests: ["Fantasy", "Romance"],
      interval: "Weekly",
    },
    {
      id: 2,
      name: "Morning Joggers 🏃‍♀️",
      interests: ["Running", "Wellness"],
      interval: "Daily",
    },
  ]);

  const handleCreateGroup = () => {
    // Later you can open a modal here
    const newGroup = {
      id: Date.now(),
      name: "New Group ✨",
      interests: [],
      interval: "Unset",
    };
    setGroups([...groups, newGroup]);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-blue-600">Your Chat Groups 💬</h2>
        <Button
          onClick={handleCreateGroup}
          className="flex items-center gap-2 rounded-full px-4 py-2 shadow-md bg-blue-500 hover:bg-blue-600 text-white"
        >
          <PlusCircle size={20} />
          New Group
        </Button>
      </div>

      {/* Groups List */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card
            key={group.id}
            className="rounded-2xl border-2 border-blue-200 hover:shadow-lg transition"
          >
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-700">
                {group.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>
                <span className="font-medium">Interests:</span>{" "}
                {group.interests.length > 0
                  ? group.interests.join(", ")
                  : "None yet"}
              </p>
              <p>
                <span className="font-medium">Update Interval:</span>{" "}
                {group.interval}
              </p>
              <Button
                size="sm"
                className="mt-3 rounded-full bg-blue-400 hover:bg-blue-500 text-white"
              >
                Open Chat
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
