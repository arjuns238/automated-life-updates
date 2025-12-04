import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  const navLinks = [
    { label: "Home", to: "/this-month" },
    { label: "Timeline", to: "/timeline" },
    { label: "Summary", to: "/summary" },
    { label: "Chats", to: "/chats" },
    { label: "Settings", to: "/settings" },
    { label: "Profile", to: "/profile" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const currentUser = data?.session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const defaultAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.id}`;
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", currentUser.id)
          .single();

        if (error) {
          setAvatarUrl(defaultAvatar);
        } else {
          setAvatarUrl(profileData?.avatar_url || defaultAvatar);
        }
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/sign-in");
  };

  return (
    <nav className="fixed top-0 left-0 z-50 w-full backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-blue-950/90 border-b border-white/10 shadow-lg shadow-blue-900/20" />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-lg font-semibold text-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-800/40">
            <Sparkles className="h-5 w-5" />
          </span>
          dAIly
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 shadow-inner shadow-blue-500/10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <Link to="/profile">
                  <Avatar className="h-8 w-8 cursor-pointer">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="User Avatar" />
                    ) : (
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                    )}
                  </Avatar>
                </Link>
                <span className="hidden text-sm font-medium text-slate-200 lg:block">
                  {user.email}
                </span>
              </div>
              <Button
                variant="secondary"
                className="border border-white/10 bg-white/10 text-white hover:bg-white/20"
                onClick={() => navigate("/settings")}
              >
                Settings
              </Button>
              <Button
                variant="ghost"
                className="text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </>
          ) : (
            <Button
              variant="hero"
              className="shadow-glow"
              onClick={() => navigate("/sign-in")}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
