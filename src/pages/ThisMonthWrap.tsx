import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { API_BASE_URL } from "@/lib/apiBase";
import {
  Activity,
  CalendarDays,
  Loader2,
  Music2,
  Share2,
  Sparkles,
  Wand2,
} from "lucide-react";

type CalendarHighlight = {
  title: string;
  date_label: string;
};

type CalendarSummary = {
  highlights: CalendarHighlight[];
};

type StravaSummary = {
  total_activities: number;
  total_distance_km: number;
  moving_time_hours: number;
};

type MusicSummary = {
  top_track?: string | null;
  top_genres: string[];
  total_minutes_listened: number;
};

type LifeUpdateSnippet = {
  id: string;
  title?: string | null;
  created_at?: string | null;
  snippet?: string | null;
};

type WrapResponse = {
  month_label: string;
  ai_summary: string;
  strava: StravaSummary;
  music: MusicSummary;
  calendar: CalendarSummary;
  life_updates: LifeUpdateSnippet[];
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-10 text-white/80 shadow-lg backdrop-blur">
    <Loader2 className="h-8 w-8 animate-spin text-indigo-200" />
    <p className="text-sm">Gathering your month...</p>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-rose-300/30 bg-rose-300/10 p-10 text-rose-50 shadow-lg backdrop-blur">
    <p className="text-sm text-center">{message}</p>
  </div>
);

export default function ThisMonthWrap() {
  const [wrap, setWrap] = useState<WrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Please sign in to see your wrap.");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/api/wrap/this-month?user_id=${encodeURIComponent(user.id)}`
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to load wrap (${res.status})`);
        }
        const json = (await res.json()) as WrapResponse;
        if (!isMounted) return;
        setWrap(json);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Could not fetch your wrap.";
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWrap();
    return () => {
      isMounted = false;
    };
  }, []);

  const stravaLabel = useMemo(() => {
    if (!wrap) return "";
    return `${wrap.strava.total_activities} activities • ${wrap.strava.total_distance_km.toFixed(
      1
    )} km`;
  }, [wrap]);

  const musicLabel = useMemo(() => {
    if (!wrap) return "";
    const genres = wrap.music.top_genres?.slice(0, 2).join(" · ");
    if (wrap.music.top_track) {
      return `${wrap.music.top_track} • ${genres || "mixed vibes"}`;
    }
    return genres || "Discovering new sounds";
  }, [wrap]);

  const highlightCard = useMemo(() => {
    if (!wrap?.calendar.highlights?.length) {
      return <p className="text-sm text-slate-200/80">No calendar highlights yet.</p>;
    }
    return (
      <ul className="space-y-2">
        {wrap.calendar.highlights.map((item, idx) => (
          <li
            key={`${item.title}-${idx}`}
            className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm"
          >
            <span className="mt-[2px] rounded-full bg-white/15 px-2 py-1 text-[11px] font-medium text-white/80">
              {item.date_label}
            </span>
            <span className="text-slate-100">{item.title}</span>
          </li>
        ))}
      </ul>
    );
  }, [wrap]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-950 to-black px-4 py-10 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center gap-3 text-indigo-100">
          <Sparkles className="h-6 w-6" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">This month, at a glance</h1>
            <p className="text-sm text-indigo-100/80">
              A shareable mini-wrapped crafted from your updates and integrations.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden border border-white/15 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-950 text-white shadow-2xl backdrop-blur-xl">
          <CardHeader className="border-b border-white/15 pb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-semibold text-white">
                  Your month in a nutshell
                </CardTitle>
                <p className="text-sm text-indigo-100/70">
                  {wrap?.month_label || "Loading current month..."}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-indigo-50">
                <Wand2 className="h-4 w-4" />
                AI crafted
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            {loading && <LoadingState />}
            {!loading && error && <ErrorState message={error} />}

            {!loading && !error && wrap && (
              <>
                <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/70 p-4 shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 via-pink-500/15 to-cyan-500/15" />
                  <div className="relative flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-100" />
                    <p className="text-sm leading-relaxed text-white whitespace-pre-line">
                      {wrap.ai_summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Activity className="h-4 w-4 text-green-200" />
                      Strava
                    </div>
                    <p className="mt-2 text-lg font-semibold text-white">{stravaLabel}</p>
                    <p className="text-xs text-slate-200/70">
                      {wrap.strava.moving_time_hours.toFixed(1)} hours moving this month.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Music2 className="h-4 w-4 text-pink-200" />
                      Music
                    </div>
                    <p className="mt-2 text-lg font-semibold text-white">{musicLabel}</p>
                    <p className="text-xs text-slate-200/70">
                      {wrap.music.total_minutes_listened} minutes listened.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <CalendarDays className="h-4 w-4 text-sky-200" />
                      Calendar
                    </div>
                    <div className="mt-2 space-y-3">{highlightCard}</div>
                  </div>
                </div>

                {wrap.life_updates?.length > 0 && (
                  <div className="rounded-2xl border border-white/15 bg-slate-900/60 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Activity className="h-4 w-4 text-amber-200" />
                      Recent updates
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {wrap.life_updates.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-100"
                        >
                          <p className="font-semibold text-white">{item.title || "Untitled"}</p>
                          <p className="text-[11px] text-white/60">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "This month"}
                          </p>
                          <p className="mt-1 text-slate-200/90">{item.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-900/60 p-4">
                  <div className="text-sm text-slate-100/80">
                    Ready to show off? Grab this card and share it anywhere.
                  </div>
                  <Button
                    variant="secondary"
                    className="bg-white text-slate-900 shadow-md hover:bg-slate-100"
                    onClick={() => console.log("Share CTA pressed")}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share this
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

}
