import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Gift, PenSquare, History, LayoutGrid } from "lucide-react";

const navItems = [
  { to: "/life-updates", icon: PenSquare },
  { to: "/wrap", icon: Gift },
  { to: "/timeline", icon: History },
  { to: "/settings", icon: LayoutGrid },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSignedIn(!!session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSignedIn(!!session);
    });

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const isActive = (path: string) => {
    if (location.pathname === path) return true;
    return location.pathname.startsWith(`${path}/`);
  };

  const hideNav = ["/sign-in", "/sign-up", "/auth/callback"].includes(location.pathname);

  if (!signedIn || hideNav) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl h-20 bg-[#141414] border border-white/10 rounded-[2.5rem] flex items-center justify-between px-4 shadow-2xl shadow-black/40 z-50 md:flex">
      {navItems.map(({ to, icon: Icon }) => {
        const active = isActive(to);

        return (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition",
              active
                ? "bg-white text-black shadow-lg shadow-white/10"
                : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
          >
            <Icon className="w-6 h-6" />
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
