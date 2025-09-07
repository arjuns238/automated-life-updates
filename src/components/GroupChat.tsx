import { useState } from "react";
import { useSendMessage } from "../hooks/useSendMessage";
import { useGroupMessages } from "../hooks/useGroupMessages";

export function GroupChat({ groupId }: { groupId: string }) {
  const [content, setContent] = useState("");
  const { sendMessage, loading } = useSendMessage();
  const messages = useGroupMessages(groupId);

  const handleSend = async () => {
    if (content.trim()) {
      await sendMessage(groupId, content);
      setContent("");
    }
  };

  return (
    <div>
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <b>{msg.user?.email || "User"}:</b> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
        placeholder="Type a message..."
      />
      <button onClick={handleSend} disabled={loading || !content.trim()}>
        Send
      </button>
    </div>
  );
}