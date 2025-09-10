import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-3xl font-bold">Welcome to FriendSync!</h1>
      <div className="flex gap-4">
        <Button onClick={() => navigate("/summary")}>Generate Summary</Button>
        <Button onClick={() => navigate("/chats")}>Access Chats</Button>
      </div>
    </div>
  );
}