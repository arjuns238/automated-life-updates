import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Home as HomeIcon, MessageCircle, Sparkles, User } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background flex text-blue-700">
      {/* Sidebar */}
      <aside className="w-56 bg-white/70 backdrop-blur-md shadow-md flex flex-col items-center py-6 gap-6">
        <h2 className="text-2xl font-extrabold text-blue-700">🌐 FS</h2>
        <nav className="flex flex-col gap-4 w-full px-4">
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700"
            onClick={() => navigate("/")}
          >
            <HomeIcon size={20} /> Home
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700"
            onClick={() => navigate("/summary")}
          >
            <Sparkles size={20} /> Summary
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700"
            onClick={() => navigate("/chats")}
          >
            <MessageCircle size={20} /> Chats
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700"
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
          <h1 className="text-xl font-bold text-blue-700">FriendSync</h1>
          <Button
            onClick={() => navigate("/settings")}
            className="bg-blue-400 hover:bg-blue-500 text-white rounded-xl px-4 py-2"
          >
            Settings
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex items-center justify-center">
          <div className="bg-white/80 rounded-2xl shadow-lg p-8 max-w-xl w-full text-center border border-border/60 backdrop-blur">
            <h2 className="text-3xl font-bold text-blue-700 mb-2">
              Welcome back! 🌟
            </h2>
            <p className="text-blue-700 mb-6">
              Choose an option from the sidebar to get started.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate("/summary")}
                className="bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-glow hover:shadow-warm transition-all"
              >
                Generate Summary
              </Button>
              <Button
                onClick={() => navigate("/chats")}
                variant="outline"
                className="px-6 text-blue-700"
              >
                Access Chats
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}