import { useState } from "react";
import { ArrowLeft, Send, Info, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GroupChat({
  group,
  onBack,
  onSendMessage,
  onUpdateGroup,
  onAddMember,
  onRemoveMember,
}) {
  const [newMessage, setNewMessage] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  // editable group state
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [topics, setTopics] = useState(group.interests || []);
  const [newTopic, setNewTopic] = useState("");
  const [interval, setInterval] = useState(group.interval || "weekly");

  // member management
  const [newMember, setNewMember] = useState("");

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(group.id, newMessage);
    setNewMessage("");
  };

  const handleSaveGroup = () => {
    onUpdateGroup(group.id, {
      name,
      description,
      interests: topics,
      interval,
    });
    setShowInfo(false);
  };

  const handleAddTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const handleRemoveTopic = (t) => {
    setTopics(topics.filter((topic) => topic !== t));
  };

  const handleAddMember = () => {
    if (newMember.trim()) {
      onAddMember(group.id, newMember.trim());
      setNewMember("");
    }
  };

  const handleRemoveMember = (memberId) => {
    onRemoveMember(group.id, memberId);
  };

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

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-blue-50 to-white">
        {group.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === "You" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-2xl max-w-xs shadow-sm ${
                msg.sender === "You"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <span className="block text-[10px] text-gray-400 mt-1">
                {msg.sender}
              </span>
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

          {/* Name */}
          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <Label>Topics / Interests</Label>
            <div className="flex gap-2">
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Add topic..."
              />
              <Button size="sm" onClick={handleAddTopic}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {topics.map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1"
                >
                  {t}
                  <button
                    onClick={() => handleRemoveTopic(t)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Update interval */}
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
              {group.members?.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between text-sm bg-gray-50 px-2 py-1 rounded-md"
                >
                  <span>{m.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveMember(m.id)}
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
                placeholder="Enter email or username"
              />
              <Button size="sm" onClick={handleAddMember}>
                <UserPlus size={16} />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSaveGroup}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
