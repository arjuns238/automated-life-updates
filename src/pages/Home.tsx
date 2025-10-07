import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Home as HomeIcon, MessageCircle, Sparkles, User } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background flex text-blue-700">
      {/* Sidebar */}
      <aside className="w-56 bg-white/70 backdrop-blur-md shadow-md flex flex-col items-center py-6 gap-6">
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
        {/* Page Content */}
        <main className="flex-1 flex items-center justify-center">
          <div className="flex w-full justify-center items-center" style={{ minHeight: 'calc(100vh - 5rem)' }}>
            <div className="bg-white/80 rounded-2xl shadow-lg p-8 max-w-xl w-full text-center border border-border/60 backdrop-blur mx-auto">
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
          </div>
        </main>
      </div>
    </div>
  );
}