import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Activity, Calendar, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const loadUpdates = async () => {
    setLoading(true);
    setError(null);
    const columns =
      "id, created_at, title, ai_summary, photos, user_summary, strava_context";
    const fallbackColumns = "id, created_at, title, ai_summary, photos, user_summary";

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
        .select(columns)
        .order("created_at", { ascending: false });

      // If the backend doesn't yet have strava_context, retry without it so the view still works.
      if (error && error.message?.toLowerCase().includes("strava_context")) {
        const fallback = await supabase
          .from("life_updates")
          .select(fallbackColumns)
          .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        const hydrated = (fallback.data || []).map((row) => ({
          ...row,
          strava_context: null,
        }));
        setUpdates(hydrated as LifeUpdate[]);
        return;
      }

      if (error) throw error;
      setUpdates((data || []) as LifeUpdate[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not load your updates.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("life_updates").delete().eq("id", id);
      if (error) throw error;
      setUpdates(prev => prev.filter(u => u.id !== id));
      setConfirmId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not delete update.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const rendered = useMemo(
    () =>
      updates.map((item, idx) => {
        const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
        const summaryText = item.ai_summary || "No AI summary yet. Open and generate one.";
        const stravaText = deriveStravaContext(item.user_summary, item.strava_context || null);
        const accent = idx % 3 === 0 ? "from-slate-900/90 via-blue-900/70 to-slate-950/80" : idx % 3 === 1 ? "from-slate-900/90 via-sky-900/70 to-slate-950/80" : "from-slate-900/90 via-indigo-900/70 to-slate-950/80";
        const backdrop = photos[0];

        return (
            <Card
              key={item.id}
              className="group relative flex flex-col overflow-visible rounded-[1.5rem] border border-white/10 bg-[#18181b] shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-1"
            >
            {backdrop && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-35 blur-[1px] transition duration-300 group-hover:opacity-45 pointer-events-none"
                style={{ backgroundImage: `url(${backdrop})` }}
              />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-70 transition duration-300 group-hover:opacity-80 pointer-events-none" />
            <CardHeader className="relative z-10 flex flex-col gap-1 pb-2 sm:flex-row sm:items-start">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-white">{item.title}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <Calendar className="h-4 w-4 text-cyan-300" />
                  <span>{monthLabel(item.created_at)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 flex-1 pt-0 flex flex-col">
              <p className="text-sm leading-relaxed text-gray-100 whitespace-pre-line">
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
              <div className="mt-auto pt-6 flex w-full items-center justify-between gap-3 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/10 bg-white/10 text-xs text-white backdrop-blur hover:bg-white/15"
                  onClick={() => navigate("/summary", { state: { aiSummary: item.ai_summary, photo_urls: photos } })}
                >
                  View summary
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-rose-300/30 bg-rose-500/20 text-xs text-rose-50 hover:bg-rose-500/30"
                  disabled={deletingId === item.id}
                  onClick={() => setConfirmId(item.id)}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }),
    [updates, navigate, deletingId, confirmId]
  );

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-100 flex flex-col items-center px-4 py-10 md:py-14">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-white">Timeline</h1>
            <p className="text-base text-gray-400">All your updates in one place.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full border border-white/10 bg-white text-black hover:bg-gray-200"
            onClick={() => navigate("/life-updates")}
          >
            New update
          </Button>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#18181b] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Your story, stitched together</p>
              <p className="text-sm text-gray-400">See every recap, photos, and Strava highlights in one place.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={loadUpdates}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border border-white/10 bg-white text-black hover:bg-gray-200"
                onClick={() => navigate("/life-updates")}
              >
                Add update
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
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
          <Card className="rounded-[2rem] border border-white/10 bg-[#18181b] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <CardContent className="py-10 text-center text-gray-300">
              <p className="mb-3 text-lg font-semibold text-white">No updates yet</p>
              <p className="text-sm">Create your first life update to start your timeline.</p>
              <Button className="mt-4 rounded-full border border-white/10 bg-white text-black hover:bg-gray-200" onClick={() => navigate("/life-updates")}>
                Create an update
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{rendered}</div>
        )}
      </div>
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f13] p-5 text-white shadow-2xl">
            <p className="text-base font-semibold mb-3">Are you sure you want to delete?</p>
            <p className="text-sm text-gray-300 mb-4">This will remove the update from your timeline.</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/10 bg-white/10 text-xs text-white hover:bg-white/15"
                onClick={() => setConfirmId(null)}
                disabled={deletingId === confirmId}
              >
                No
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border border-rose-300/30 bg-rose-500/20 text-xs text-rose-50 hover:bg-rose-500/30"
                disabled={deletingId === confirmId}
                onClick={() => handleDelete(confirmId)}
              >
                {deletingId === confirmId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
