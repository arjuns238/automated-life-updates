import { Link, useLocation } from "react-router-dom";
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

  const isActive = (path: string) => {
    if (location.pathname === path) return true;
    return location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/90 backdrop-blur-2xl md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-2 py-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium text-slate-300 transition",
                active && "bg-white/10 text-white shadow-lg shadow-blue-900/30"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active ? "text-white" : "text-slate-400"
                )}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
