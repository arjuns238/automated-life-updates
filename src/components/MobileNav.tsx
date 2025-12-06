import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  Clock3,
  ScrollText,
  MessageCircle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/this-month", label: "Home", icon: Home },
  { to: "/timeline", label: "Timeline", icon: Clock3 },
  { to: "/summary", label: "Summary", icon: ScrollText },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/settings", label: "Settings", icon: Settings },
];

const MobileNav = () => {
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

  if (signedIn === false) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/85 backdrop-blur-2xl md:hidden pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
      <div className="mx-auto flex max-w-6xl items-start justify-between px-3 pb-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center justify-start gap-0.5 rounded-xl px-3 pt-2 pb-1.5 text-slate-300 transition",
                active && "bg-white/10 text-white shadow-lg shadow-blue-900/30"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 -translate-y-0.5",
                  active ? "text-white" : "text-slate-400"
                )}
              />
              <span className="-translate-y-0.5 text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
