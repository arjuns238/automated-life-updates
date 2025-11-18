import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Activity, Calendar, Image as ImageIcon, Loader2 } from "lucide-react";

type LifeUpdate = Tables<"life_updates"> & {
  strava_context?: string | null;
};

const monthLabel = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const deriveStravaContext = (input?: string | null, stored?: string | null) => {
  if (stored && stored.trim()) return stored.trim();
  if (!input) return null;

  let totalKm = 0;
  let runs = 0;
  let rides = 0;

  input.split(/\n+/).forEach((line) => {
    const dist = line.match(/([0-9]+(?:\.[0-9]+)?)\s*km/i);
    if (dist) {
      totalKm += parseFloat(dist[1]);
    }
    const type = (line.match(/\(([^)]+)\)/)?.[1] || "").toLowerCase();
    if (type.includes("run")) runs += 1;
    if (type.includes("ride") || type.includes("bike") || type.includes("cycle")) rides += 1;
  });

  if (!totalKm && !runs && !rides) return null;
  const distanceLabel = `${Math.round(totalKm)} km`;
  const runLabel = runs ? `${runs} run${runs > 1 ? "s" : ""}` : null;
  const rideLabel = rides ? `${rides} ride${rides > 1 ? "s" : ""}` : null;

  return [
    "🏃‍♂️",
    distanceLabel,
    runLabel ? `· ${runLabel}` : "",
    rideLabel ? `· ${rideLabel}` : "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
};

const PhotoStrip = ({ photos }: { photos: string[] }) => {
  if (!photos.length) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {photos.slice(0, 6).map((src, i) => (
        <div
          key={i}
          className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5"
        >
          <img
            src={src}
            alt={`Attachment ${i + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ))}
    </div>
  );
};

export default function Timeline() {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<LifeUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in to view your timeline.");
        setUpdates([]);
        return;
      }

      const { data, error } = await supabase
        .from("life_updates")
        .select("id, created_at, title, ai_summary, photos, user_summary")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUpdates((data || []) as LifeUpdate[]);
    } catch (e: any) {
      setError(e?.message || "Could not load your updates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  const rendered = useMemo(
    () =>
      updates.map((item, idx) => {
        const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
        const summaryText = item.ai_summary || "No AI summary yet — open and generate one.";
        const stravaText = deriveStravaContext(item.user_summary, (item as any).strava_context || null);
        const accent = idx % 3 === 0 ? "from-slate-900/90 via-blue-900/70 to-slate-950/80" : idx % 3 === 1 ? "from-slate-900/90 via-sky-900/70 to-slate-950/80" : "from-slate-900/90 via-indigo-900/70 to-slate-950/80";
        const backdrop = photos[0];

        return (
          <Card
            key={item.id}
            className={`group relative overflow-hidden border border-white/10 bg-gradient-to-br ${accent} shadow-2xl backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-blue-900/30`}
            style={{ borderRadius: "18px" }}
          >
            {backdrop && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-35 blur-[1px] transition duration-300 group-hover:opacity-45"
                style={{ backgroundImage: `url(${backdrop})` }}
              />
            )}
            <div className="absolute inset-0 bg-black/25 opacity-70 transition duration-300 group-hover:opacity-80" />
            <CardHeader className="relative flex flex-col gap-1 pb-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-white">{item.title}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-slate-200/90">
                  <Calendar className="h-4 w-4 text-blue-200" />
                  <span>{monthLabel(item.created_at)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 rounded-full border border-white/30 bg-white/10 text-xs text-white backdrop-blur hover:bg-white/20 sm:mt-0"
                onClick={() => navigate("/summary", { state: { aiSummary: item.ai_summary, photo_urls: photos } })}
              >
                View summary
              </Button>
            </CardHeader>
            <CardContent className="relative pt-0">
              <p className="text-sm leading-relaxed text-slate-50 whitespace-pre-line">
                {summaryText}
              </p>

              <PhotoStrip photos={photos} />

              {(stravaText || photos.length > 0) && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-100">
                  {stravaText && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                      <Activity className="h-4 w-4 text-green-300" />
                      {stravaText}
                    </div>
                  )}
                  {photos.length > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                      <ImageIcon className="h-4 w-4 text-blue-200" />
                      {photos.length} photo{photos.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      }),
    [updates, navigate]
  );

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_25%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#ffffff0f_1px,transparent_0)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/life-updates")}
              className="rounded-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              ← Back
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100 shadow-inner shadow-blue-500/10">
              <Activity className="h-4 w-4 text-green-300" />
              My Timeline
            </div>
          </div>
          <Button
            variant="hero"
            size="sm"
            className="shadow-glow"
            onClick={() => navigate("/life-updates")}
          >
            New update
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-slate-100 shadow-inner shadow-blue-900/30">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Your story, stitched together</p>
              <p className="text-xs text-slate-200/80">See every recap, photos, and Strava highlights in one place.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
                onClick={loadUpdates}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border border-white/10 bg-white/15 text-white hover:bg-white/25"
                onClick={() => navigate("/life-updates")}
              >
                Add update
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200">
            <Loader2 className="h-4 w-4 animate-spin text-blue-200" />
            Loading your timeline...
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-rose-500/20 px-4 py-3 text-sm text-rose-50">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/10 bg-white/10 text-white hover:bg-white/20"
              onClick={loadUpdates}
            >
              Retry
            </Button>
          </div>
        ) : updates.length === 0 ? (
          <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="py-10 text-center text-slate-300">
              <p className="mb-3 text-lg font-semibold text-white">No updates yet</p>
              <p className="text-sm">Create your first life update to start your timeline.</p>
              <Button
                className="mt-4"
                variant="hero"
                onClick={() => navigate("/life-updates")}
              >
                Create an update
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{rendered}</div>
        )}
      </div>
    </div>
  );
}
