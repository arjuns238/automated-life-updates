import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Navbar = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === "/" || location.pathname === "/this-month";

  const navLinks = [
    { label: "Home", to: "/this-month" },
    { label: "Timeline", to: "/timeline" },
    { label: "Update", to: "/summary" },
    { label: "Chats", to: "/chats" },
    { label: "Settings", to: "/settings" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
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

        {!isLanding && (
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
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm font-medium text-slate-200 lg:block">
                {user.email}
              </span>
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
              variant="secondary"
              size="lg"
              className="beam-button h-12 border border-white/25 bg-white/10 px-6 text-slate-50 shadow-glow hover:bg-white/20 rounded-xl"
              style={{ borderRadius: "14px" }}
              onClick={() => navigate("/sign-in")}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
