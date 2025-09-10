import GroupChat from "@/components/GroupChat";

export default function Chats() {
  // You can add group selection logic here later
  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold mb-4">Your Chat Groups</h2>
      {/* Example: Show a single group chat for now */}
      <GroupChat groupId="YOUR_GROUP_ID_HERE" />
    </div>
  );
}