import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { API_BASE_URL } from "@/lib/apiBase";
import {
  Activity,
  CalendarDays,
  ListChecks,
  Loader2,
  Music2,
  Sparkles,
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

type StoredWrap = {
  wrap: WrapResponse;
  generatedAt: string;
};

const STORAGE_KEY = "this-month-wrap";

const getMonthLabel = () =>
  new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

const getPreviewLine = (text?: string) => {
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/)[0];
  if (sentence) return sentence.trim();
  return text.slice(0, 140);
};

export default function Home() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Arjun");
  const [stats, setStats] = useState({
    updates: 0,
    workouts: 0,
    minutes: 0,
    events: 0,
  });
  const [wrap, setWrap] = useState<WrapResponse | null>(null);
  const [wrapGeneratedAt, setWrapGeneratedAt] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingWrap, setLoadingWrap] = useState(false);
  const [wrapError, setWrapError] = useState<string | null>(null);

  const monthLabel = useMemo(() => getMonthLabel(), []);
  const wrapPreview = useMemo(() => getPreviewLine(wrap?.ai_summary), [wrap?.ai_summary]);

  useEffect(() => {
    let isMounted = true;

    const loadUserAndStats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUserId(user?.id ?? null);
      const displayName =
        (user?.user_metadata as Record<string, string | undefined> | undefined)?.full_name ||
        (user?.user_metadata as Record<string, string | undefined> | undefined)?.name ||
        user?.email?.split("@")[0] ||
        "Arjun";
      setUserName(displayName);

      if (user?.id) {
        fetchLifeUpdateCount(user.id, () => isMounted);
      }

      loadCachedWrap(() => isMounted);
    };

    loadUserAndStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadCachedWrap = (isMounted: () => boolean) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredWrap;
      if (!parsed?.wrap) return;
      if (!isMounted()) return;
      setWrap(parsed.wrap);
      setWrapGeneratedAt(parsed.generatedAt);
      setStats(prev => ({
        ...prev,
        workouts: parsed.wrap.strava.total_activities || 0,
        minutes: parsed.wrap.music.total_minutes_listened || 0,
        events: parsed.wrap.calendar.highlights?.length || 0,
      }));
    } catch (e) {
      console.warn("Failed to load cached wrap", e);
    }
  };

  const fetchLifeUpdateCount = async (uid: string, isMounted: () => boolean) => {
    setLoadingStats(true);
    try {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);

      const { count, error } = await supabase
        .from("life_updates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

      if (error) {
        console.error("Could not load life update count", error);
        return;
      }
      if (!isMounted()) return;
      setStats(prev => ({ ...prev, updates: count ?? 0 }));
    } finally {
      if (isMounted()) {
        setLoadingStats(false);
      }
    }
  };

  const generateWrap = async () => {
    if (!userId) {
      setWrapError("Sign in to generate your wrap.");
      return;
    }
    setLoadingWrap(true);
    setWrapError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/wrap/this-month?user_id=${encodeURIComponent(userId)}`
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed with ${res.status}`);
      }
      const data = (await res.json()) as WrapResponse;
      const generatedAt = new Date().toISOString();

      setWrap(data);
      setWrapGeneratedAt(generatedAt);
      setStats(prev => ({
        ...prev,
        workouts: data.strava.total_activities || 0,
        minutes: data.music.total_minutes_listened || 0,
        events: data.calendar.highlights?.length || 0,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ wrap: data, generatedAt } satisfies StoredWrap));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not generate your wrap.";
      setWrapError(message);
    } finally {
      setLoadingWrap(false);
    }
  };

  const handleViewWrap = () => {
    if (!wrap) return;
    navigate("/wrap", { state: { wrap, generatedAt: wrapGeneratedAt } });
  };

  const wrapExists = Boolean(wrap);
  const craftedLabel = wrapExists
    ? `AI crafted ${
        wrapGeneratedAt
          ? new Date(wrapGeneratedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : monthLabel
      }`
    : "Your recap isn't generated yet.";

  const integrationCards = [
    {
      title: "Life updates",
      metric: `${stats.updates || 0} updates`,
      description: "Quick notes and photos you’ve logged this month.",
      icon: ListChecks,
      action: () => navigate("/life-updates"),
      actionLabel: "Add update",
    },
    {
      title: "Strava",
      metric: `${stats.workouts || 0} workouts`,
      description: "Runs and rides synced to your wrap.",
      icon: Activity,
      action: () => navigate("/settings"),
      actionLabel: "Manage Strava",
    },
    {
      title: "Spotify",
      metric: `${stats.minutes || 0} min listened`,
      description: "Top tracks and genres from your month.",
      icon: Music2,
      action: () => navigate("/settings"),
      actionLabel: "Manage Spotify",
    },
    {
      title: "Calendar",
      metric: `${stats.events || 0} events`,
      description: "Highlights pulled from your calendar.",
      icon: CalendarDays,
      action: () => navigate("/settings"),
      actionLabel: "Manage Calendar",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Home</p>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="text-slate-300">{monthLabel}</p>
        </header>

        <Card className="border border-white/10 bg-slate-900/80 text-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Your month so far</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Updates", value: stats.updates },
              { label: "Workouts", value: stats.workouts },
              { label: "Min listened", value: stats.minutes },
              { label: "Events", value: stats.events },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">{item.label}</p>
                <p className="text-2xl font-semibold">
                  {loadingStats ? <Loader2 className="h-5 w-5 animate-spin text-slate-200" /> : item.value}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-200" />
            <h2 className="text-lg font-semibold text-white">Your integrations</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {integrationCards.map(card => (
              <Card
                key={card.title}
                className="border border-white/10 bg-slate-900/80 text-white shadow-md"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <card.icon className="h-4 w-4 text-cyan-200" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xl font-semibold">{card.metric}</p>
                  <p className="text-sm text-slate-300">{card.description}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 text-white hover:bg-white/20"
                    onClick={card.action}
                  >
                    {card.actionLabel}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card className="border border-white/10 bg-slate-900/80 text-white shadow-lg">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-slate-400">
                This Month’s Wrap
              </p>
              <CardTitle className="text-2xl">This Month’s Wrap</CardTitle>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
              {craftedLabel}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {wrapError && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-50">
                {wrapError}
              </div>
            )}

            {wrapExists ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-200">{wrapPreview || "Wrap is ready."}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{wrap?.life_updates?.length || 0} updates</span>
                  <span>•</span>
                  <span>{wrap?.strava.total_activities || 0} workouts</span>
                  <span>•</span>
                  <span>{wrap?.music.total_minutes_listened || 0} min listened</span>
                  <span>•</span>
                  <span>{wrap?.calendar.highlights?.length || 0} events</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleViewWrap} className="bg-white text-slate-900 hover:bg-slate-100">
                    View Wrap
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-dashed border-white/20 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-200">Your recap isn’t generated yet.</p>
                <p className="text-xs text-slate-400">Summaries take a few seconds.</p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={generateWrap} disabled={loadingWrap} className="bg-white text-slate-900 hover:bg-slate-100">
                    {loadingWrap && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Wrap
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
