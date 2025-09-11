import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Home, MessageCircle, Sparkles, User } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white/70 backdrop-blur-md shadow-md flex flex-col items-center py-6 gap-6">
        <h2 className="text-2xl font-extrabold text-purple-600">🌸 FS</h2>
        <nav className="flex flex-col gap-4 w-full px-4">
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-pink-100"
            onClick={() => navigate("/")}
          >
            <Home size={20} /> Home
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-pink-100"
            onClick={() => navigate("/summary")}
          >
            <Sparkles size={20} /> Summary
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-pink-100"
            onClick={() => navigate("/chats")}
          >
            <MessageCircle size={20} /> Chats
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-pink-100"
            onClick={() => navigate("/profile")}
          >
            <User size={20} /> Profile
          </Button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md shadow-sm">
          <h1 className="text-xl font-bold text-purple-700">FriendSync</h1>
          <Button
            onClick={() => navigate("/settings")}
            className="bg-purple-400 hover:bg-purple-500 text-white rounded-xl px-4 py-2"
          >
            Settings
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          <div className="bg-white/80 rounded-2xl shadow-lg p-6 text-center">
            <h2 className="text-3xl font-bold text-purple-700 mb-2">
              Welcome back! 🌟
            </h2>
            <p className="text-gray-600 mb-4">
              Choose an option from the sidebar to get started.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
