import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Sparkles,
  Images,
  Activity,
  CalendarDays,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const displayName =
        (user?.user_metadata as Record<string, string | undefined> | undefined)?.full_name ||
        (user?.user_metadata as Record<string, string | undefined> | undefined)?.name ||
        user?.email?.split("@")[0] ||
        "";
      setUserName(displayName);
    };
    load();
  }, []);

  useEffect(() => {
    setIsRedirecting(true);
    const id = setTimeout(() => navigate("/life-updates", { replace: true }), 200);
    return () => clearTimeout(id);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#000000] text-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c0c12] via-[#08080d] to-[#020204] p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)] space-y-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-gray-300">
          <Sparkles className="h-4 w-4 text-cyan-200" />
          Memory-first recap
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-semibold text-white leading-tight">
            Hi {userName || "there"}, we&apos;re sending you to build your update.
          </h1>
          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto">
            dAIly helps you remember your month with almost no effort: scroll your photos, tap suggested moments from
            Strava/Spotify/Calendar, add one-line context, and let AI stitch the recap.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 text-left">
          {[
            { icon: Images, title: "Photo-first", desc: "Swipe recent photos, add context with a single line." },
            { icon: Activity, title: "Auto-suggested", desc: "We surface workouts, calendar nights, music spikes." },
            { icon: CalendarDays, title: "One flow", desc: "Your Month → Suggested Moments → Add context → Save." },
          ].map(card => (
            <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex gap-3 items-start">
              <card.icon className="h-5 w-5 text-cyan-200 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">{card.title}</p>
                <p className="text-xs text-gray-400">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={() => navigate("/life-updates", { replace: true })}
            className="rounded-full bg-white text-black hover:bg-gray-200 min-w-[200px]"
          >
            Go to Create Update
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/wrap")}
            className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            View wrap
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          {isRedirecting ? (
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting you to the memory capture flow…
            </div>
          ) : (
            "If nothing happens, tap “Go to Create Update.”"
          )}
        </div>
      </div>
    </div>
  );
}
