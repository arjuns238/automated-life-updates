import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Loader2, Upload, Sparkles, X, Music2, Headphones, CalendarDays, MapPin } from "lucide-react";
import { getSpotifyStatus } from "@/integrations/spotify/auth";
import {
  getGoogleStatus,
  fetchGoogleEvents,
  getGooglePreferences,
  defaultCalendarSettings,
  type CalendarSettings,
  type SanitizedCalendarEvent,
} from "@/integrations/google/auth";
import { API_BASE_URL } from "@/lib/apiBase";

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
};

type SpotifyTrack = {
  id: string;
  name: string;
  artists: string;
  album?: string;
  image?: string;
  preview_url?: string;
  url?: string;
};

type SpotifyArtist = {
  id: string;
  name: string;
  image?: string;
  genres?: string[];
  url?: string;
};

type SpotifyRecent = {
  id: string;
  played_at: string;
  track: SpotifyTrack;
};

export default function LifeUpdates() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [userSummary, setUserSummary] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyTopTracks, setSpotifyTopTracks] = useState<SpotifyTrack[]>([]);
  const [spotifyTopArtists, setSpotifyTopArtists] = useState<SpotifyArtist[]>([]);
  const [spotifyRecent, setSpotifyRecent] = useState<SpotifyRecent[]>([]);
  const hasSpotifyData =
    spotifyTopTracks.length > 0 || spotifyTopArtists.length > 0 || spotifyRecent.length > 0;
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<SanitizedCalendarEvent[]>([]);
  const hasGoogleEvents = googleEvents.length > 0;
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>(defaultCalendarSettings);
  const [calendarBullets, setCalendarBullets] = useState<string[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "Saving your update...",
    "Organizing the details...",
    "Drafting your summary...",
    "Adding finishing touches...",
  ];
  const { toast } = useToast();
  const [integrationTab, setIntegrationTab] = useState<"strava" | "spotify" | "calendar">("strava");

  // const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = e.target.files ? Array.from(e.target.files) : [];
  //   if (!files.length) return;

  //   setPhotos((prev) => [...prev, ...files]);
  //   const newPreviews = files.map((f) => URL.createObjectURL(f));
  //   setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  // };

//   const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//   const files = e.target.files ? Array.from(e.target.files) : [];
//   console.log("Uploaded files:", files); // Debugging
//   if (!files.length) return;

//   setPhotos(prev => [...prev, ...files]);
//   const newPreviews = files.map(f => URL.createObjectURL(f));
//   console.log("Generated previews:", newPreviews); // Debugging
//   setPhotoPreviews(prev => [...prev, ...newPreviews]);
// };

const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files ? Array.from(e.target.files) : [];
  if (!files.length) return;

  // Log file details for debugging
  files.forEach((file) => {
    console.log("File uploaded:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`, // Convert size to KB
    });
  });

  setPhotos((prev) => [...prev, ...files]);
  const newPreviews = files.map((f) => URL.createObjectURL(f));
  setPhotoPreviews((prev) => [...prev, ...newPreviews]);
};
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      if (user?.id) {
        fetchStravaActivities(user.id);
        fetchSpotifyData(user.id);
        loadCalendarPreferences(user.id);
        fetchGoogleData(user.id);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isSubmitting) {
      setLoadingStep(0);
      return;
    }

    if (loadingStep >= loadingMessages.length - 1) {
      return;
    }

    const id = setTimeout(() => {
      setLoadingStep((prev) => Math.min(prev + 1, loadingMessages.length - 1));
    }, 2500);

    return () => clearTimeout(id);
  }, [isSubmitting, loadingStep, loadingMessages.length]);

  const fetchStravaActivities = async (uid: string) => {
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/strava/activities?user_id=${encodeURIComponent(uid)}&per_page=5`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed with ${res.status}`);
      }
      const data = await res.json();
      // backend returns { items: [], ... } in router; fallback to array
      const items: StravaActivity[] = Array.isArray(data) ? data : data.items || [];
      setStravaActivities(items);
    } catch (err: unknown) {
      console.error("Failed to fetch Strava activities", err);
      const message = err instanceof Error ? err.message : "Could not load Strava data";
      setActivitiesError(message);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchSpotifyData = async (uid: string) => {
    setSpotifyLoading(true);
    setSpotifyError(null);
    try {
      const status = await getSpotifyStatus(uid);
      setSpotifyConnected(status.connected);
      if (!status.connected) {
        setSpotifyTopTracks([]);
        setSpotifyTopArtists([]);
        setSpotifyRecent([]);
        setSpotifyError("Spotify not connected. Connect in Settings to pull listening data.");
        return;
      }

      const topRes = await fetch(`${API_BASE_URL}/api/spotify/top?user_id=${encodeURIComponent(uid)}&limit=5&time_range=short_term`);
      if (!topRes.ok) {
        const text = await topRes.text().catch(() => "");
        throw new Error(text || `Failed to load Spotify top tracks (${topRes.status})`);
      }
      const top = await topRes.json();

      const recentRes = await fetch(`${API_BASE_URL}/api/spotify/recent?user_id=${encodeURIComponent(uid)}&limit=6`);
      if (!recentRes.ok) {
        const text = await recentRes.text().catch(() => "");
        throw new Error(text || `Failed to load recent listening (${recentRes.status})`);
      }
      const recent = await recentRes.json();

      setSpotifyTopTracks(top.tracks || []);
      setSpotifyTopArtists(top.artists || []);
      setSpotifyRecent(recent.items || []);
      setSpotifyError(null);
    } catch (err: unknown) {
      console.error("Failed to fetch Spotify data", err);
      const message = err instanceof Error ? err.message : "Could not load Spotify data";
      setSpotifyError(message);
    } finally {
      setSpotifyLoading(false);
    }
  };

  const fetchGoogleData = async (uid: string) => {
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const status = await getGoogleStatus(uid);
      setGoogleConnected(status.connected);
      if (!status.connected) {
        setGoogleEvents([]);
        setCalendarBullets([]);
        setGoogleError("Google Calendar not connected. Connect in Settings to pull events.");
        return;
      }

      const { events = [], bullets = [], settings } = await fetchGoogleEvents(uid, { maxResults: 5 });
      if (settings) {
        setCalendarSettings(settings);
      }
      setGoogleEvents(events);
      setCalendarBullets(bullets);
      setGoogleError(null);
    } catch (err: unknown) {
      console.error("Failed to fetch Google Calendar data", err);
      const message = err instanceof Error ? err.message : "Could not load Google Calendar events";
      setGoogleError(message);
      setGoogleEvents([]);
      setCalendarBullets([]);
    } finally {
      setGoogleLoading(false);
    }
  };

  const loadCalendarPreferences = async (uid: string) => {
    try {
      const { settings } = await getGooglePreferences(uid);
      setCalendarSettings(settings ?? defaultCalendarSettings);
    } catch (error) {
      console.error("Failed to load calendar preferences", error);
      setCalendarSettings(defaultCalendarSettings);
    }
  };

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  const insertActivity = (a: StravaActivity) => {
    const snippet = `\n- ${a.name || "Activity"} (${a.type || "Workout"}): ${formatDistance(a.distance)} in ${formatTime(a.moving_time)} on ${new Date(a.start_date).toLocaleDateString()}.`;
    setUserSummary(prev => (prev ? `${prev}${snippet}` : snippet.trim()));
  };

  const insertTrack = (t: SpotifyTrack, label = "Top track") => {
    const snippet = `\n- ${label}: "${t.name}" by ${t.artists}${t.album ? ` (${t.album})` : ""}.`;
    setUserSummary(prev => (prev ? `${prev}${snippet}` : snippet.trim()));
    if (!selectedTrack) {
      setSelectedTrack(t);
    }
  };

  const insertArtist = (a: SpotifyArtist) => {
    const genres = a.genres && a.genres.length ? ` • Genres: ${a.genres.slice(0, 2).join(", ")}` : "";
    const snippet = `\n- Top artist: ${a.name}${genres}.`;
    setUserSummary(prev => (prev ? `${prev}${snippet}` : snippet.trim()));
  };

  const insertRecent = (r: SpotifyRecent) => {
    const when = new Date(r.played_at).toLocaleString();
    const t = r.track;
    const snippet = `\n- Recently played: "${t.name}" by ${t.artists} on ${when}.`;
    setUserSummary(prev => (prev ? `${prev}${snippet}` : snippet.trim()));
  };

  const insertCalendarEvent = (event: SanitizedCalendarEvent) => {
    const snippet = `\n- Upcoming: ${event.label} (${event.window})${
      event.location ? ` near ${event.location}` : ""
    }.`;
    setUserSummary((prev) => (prev ? `${prev}${snippet}` : snippet.trim()));
  };

  const integrationGradientClass = useMemo(() => {
    if (integrationTab === "spotify") {
      return "bg-gradient-to-r from-[#0e2b1f]/60 via-[#1DB954]/40 to-[#0b1f17]/60";
    }
    if (integrationTab === "calendar") {
      return "bg-gradient-to-r from-[#0f1a2e]/40 via-[#4285F4]/35 to-[#0b1a32]/55";
    }
    return "bg-gradient-to-r from-orange-500/15 via-amber-400/8 to-blue-500/8";
  }, [integrationTab]);

  const handleSubmit = async () => {
    if (!title.trim() || !userSummary.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and summary",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save your life update",
          variant: "destructive",
        });
        return;
      }

      // Insert the life update
      const { data, error } = await supabase
        .from("life_updates")
        .insert({
          user_id: user.id,
          title: title.trim(),
          user_summary: userSummary.trim(),
          // photos: photos,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate AI summary using Python backend
      let summaryData = null;
      let summaryError = null;

      try {
        const calendarContext = calendarBullets.length
          ? `\n\nHere are sanitized calendar highlights:\n${calendarBullets
              .map((bullet) => `- ${bullet}`)
              .join("\n")}`
          : "";
        const enhancedSummary = `${userSummary.trim()}${calendarContext}\n\nFocus on:\n- Weave these events into a cohesive recap\n- Call out fitness stats (distance/time) when relevant\n- Keep it upbeat and concise (1-2 sentences unless user specifies otherwise)`;
        const fd = new FormData();
        fd.append("user_summary", enhancedSummary);
        fd.append("update_id", String(data.id));
        photos.forEach((file) => fd.append("photos", file, file.name));

        const response = await fetch(`${API_BASE_URL}/summarize-update`, {
          method: "POST",
          body: fd, // IMPORTANT: no manual Content-Type header
          // credentials / headers as needed (CORS, auth, etc.)
        });
        // try {
        // console.log("Sending to backend:", {
        //   user_summary: userSummary.trim(),
        //   update_id: data.id,
        // });
        //   const response = await fetch(`${API_BASE_URL}/summarize-update`, {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     // body: JSON.stringify({
        //     //   user_summary: userSummary.trim(),
        //     //   update_id: data.id,
        //     //   photos: photos
        //     // }),
        //     body: formData
        //   });
        summaryData = await response.json();
        console.log("Received from backend:", summaryData);
        if (!response.ok) throw new Error(summaryData.detail || "AI summary failed");
      } catch (err) {
        summaryError = err;
      }

      if (summaryError) {
        console.error("AI summary error:", summaryError);
        toast({
          title: "Update saved",
          description: "Your update was saved, but AI summary failed to generate",
        });
      } else {
        setAiSummary(summaryData.ai_summary);
        toast({
          title: "Success!",
          description: "Your life update has been saved and summarized",
        });
        if (selectedTrack) {
          localStorage.setItem("selected_track", JSON.stringify(selectedTrack));
        } else {
          localStorage.removeItem("selected_track");
        }
        console.log("At LifeUpdates.tsx -> Navigating to summary with:", summaryData.ai_summary);
        localStorage.setItem("aiSummary", summaryData.ai_summary);
        localStorage.setItem("photo_urls", JSON.stringify(summaryData.photo_urls));
        localStorage.setItem("last_update_id", String(summaryData.updateId)); // handy for the fallback fetch
        navigate("/summary", {
          state: {
            aiSummary: summaryData.ai_summary,
            photo_urls: summaryData.photo_urls,
            update_id: summaryData.updateId,
            selectedTrack,
          },
        });
      }

      // Reset form
      setTitle("");
      setUserSummary("");
      setPhotos([]);
      setSelectedTrack(null);
    } catch (error) {
      console.error("Error saving update:", error);
      toast({
        title: "Error",
        description: "Failed to save your update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
      {isSubmitting && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-6 py-8 text-center shadow-2xl">
            <div className="flex items-center gap-3 text-white">
              <Loader2 className="h-5 w-5 animate-spin text-blue-200" />
              <span className="font-semibold">{loadingMessages[loadingStep]}</span>
            </div>
            <p className="max-w-xs text-sm text-slate-200/80">
              Hang tight — we&apos;re saving your update and crafting a recap.
            </p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_25%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#ffffff0f_1px,transparent_0)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/this-month")}
              className="rounded-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              ← Back
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100 shadow-inner shadow-blue-500/10">
              <Sparkles className="h-4 w-4" />
              Life Updates
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
            <Activity className="h-4 w-4 text-green-300" />
            AI ready to summarize
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold leading-tight text-white">Share what happened</h1>
          <p className="max-w-3xl text-slate-300">
            Capture your highlights, add photos, and let us craft a polished recap fit for sharing.
          </p>
        </div>

        {userId && (
          <Card className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <div
              className={`pointer-events-none absolute inset-0 transition-colors ${integrationGradientClass}`}
            />
            <CardHeader className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-green-300" />
                <CardTitle className="text-white">Integrations</CardTitle>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full px-3 text-sm ${
                    integrationTab === "strava"
                      ? "border border-white/20 bg-white/15 text-white shadow-sm"
                      : "text-slate-100"
                  }`}
                  onClick={() => setIntegrationTab("strava")}
                >
                  Strava
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full px-3 text-sm ${
                    integrationTab === "spotify"
                      ? "border border-white/20 bg-white/15 text-white shadow-sm"
                      : "text-slate-100"
                  }`}
                  onClick={() => setIntegrationTab("spotify")}
                >
                  Spotify
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full px-3 text-sm ${
                    integrationTab === "calendar"
                      ? "border border-white/20 bg-white/15 text-white shadow-sm"
                      : "text-slate-100"
                  }`}
                  onClick={() => setIntegrationTab("calendar")}
                >
                  Calendar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="relative z-10 space-y-4">
              {integrationTab === "strava" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-white">
                      <Activity className="h-5 w-5 text-green-300" />
                      <p className="text-sm font-semibold">Recent Strava</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => fetchStravaActivities(userId)}
                      disabled={activitiesLoading}
                    >
                      {activitiesLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                  </div>

                  {activitiesError && (
                    <p className="text-sm text-rose-200">{activitiesError}</p>
                  )}
                  {!activitiesError && stravaActivities.length === 0 && (
                    <p className="text-sm text-slate-300">
                      No recent Strava activities found. Try a refresh after your next workout.
                    </p>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {stravaActivities.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-blue-900/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{a.name}</p>
                            <p className="text-xs text-slate-300">
                              {a.type} · {formatDistance(a.distance)} · {formatTime(a.moving_time)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(a.start_date).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                            onClick={() => insertActivity(a)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {integrationTab === "spotify" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-white">
                      <Music2 className="h-5 w-5 text-emerald-200" />
                      <p className="text-sm font-semibold">Spotify Highlights</p>
                      {spotifyConnected && (
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-emerald-50">
                          Connected
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => userId && fetchSpotifyData(userId)}
                      disabled={spotifyLoading}
                    >
                      {spotifyLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                  </div>

                  {spotifyError && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200/30 bg-black/15 px-3 py-2 text-sm text-emerald-50/90">
                      <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                      <p>
                        {spotifyError}{" "}
                        {!spotifyConnected && (
                          <button
                            onClick={() => navigate("/settings")}
                            className="underline decoration-emerald-200/80 underline-offset-4"
                          >
                            Go to Settings
                          </button>
                        )}
                      </p>
                    </div>
                  )}

                  {hasSpotifyData && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-white">
                          <Headphones className="h-4 w-4 text-emerald-100" />
                          <p className="text-sm font-semibold">Top tracks</p>
                        </div>
                        <div className="space-y-2">
                          {spotifyTopTracks.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 p-3"
                            >
                              <div className="flex items-center gap-3">
                                {t.image ? (
                                  <img src={t.image} alt={t.name} className="h-10 w-10 rounded-md object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-emerald-900/40" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-white">{t.name}</p>
                                  <p className="text-xs text-emerald-50/80">{t.artists}</p>
                                  {t.album && (
                                    <p className="text-[11px] text-emerald-50/70">{t.album}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
                                onClick={() => insertTrack(t, "Top track")}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-white">
                          <Sparkles className="h-4 w-4 text-emerald-100" />
                          <p className="text-sm font-semibold">Top artists</p>
                        </div>
                        <div className="space-y-2">
                          {spotifyTopArtists.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 p-3"
                            >
                              <div className="flex items-center gap-3">
                                {a.image ? (
                                  <img src={a.image} alt={a.name} className="h-10 w-10 rounded-md object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-emerald-900/40" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-white">{a.name}</p>
                                  {a.genres && a.genres.length > 0 && (
                                    <p className="text-xs text-emerald-50/80">
                                      {a.genres.slice(0, 2).join(", ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
                                onClick={() => insertArtist(a)}
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {hasSpotifyData && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white">
                        <Music2 className="h-4 w-4 text-emerald-100" />
                        <p className="text-sm font-semibold">Recent listening</p>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {spotifyRecent.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 p-3"
                          >
                            <div className="flex items-center gap-3">
                              {r.track.image ? (
                                <img src={r.track.image} alt={r.track.name} className="h-10 w-10 rounded-md object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-emerald-900/40" />
                              )}
                              <div>
                                <p className="text-sm font-semibold text-white">{r.track.name}</p>
                                <p className="text-xs text-emerald-50/80">{r.track.artists}</p>
                                <p className="text-xs text-emerald-50/60">
                                  {new Date(r.played_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
                              onClick={() => insertRecent(r)}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!spotifyError && !hasSpotifyData && (
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-emerald-50/90">
                      <div className="flex items-center gap-2">
                        <Headphones className="h-4 w-4 text-emerald-200" />
                        <div>
                          <p className="font-medium text-white">No listening data yet</p>
                          <p className="text-xs text-emerald-50/80">Start listening and hit refresh to pull it in.</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => userId && fetchSpotifyData(userId)}
                        disabled={spotifyLoading}
                      >
                        Refresh
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {integrationTab === "calendar" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-white">
                      <CalendarDays className="h-5 w-5 text-sky-200" />
                      <p className="text-sm font-semibold">Google Calendar</p>
                      {googleConnected && (
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-blue-50">
                          Connected
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => userId && fetchGoogleData(userId)}
                      disabled={googleLoading}
                    >
                      {googleLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                  </div>

                  {googleError && (
                    <div className="flex items-start gap-2 rounded-xl border border-blue-200/30 bg-black/20 px-3 py-2 text-sm text-blue-50/90">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
                      <p>
                        {googleError}{" "}
                        {!googleConnected && (
                          <button
                            onClick={() => navigate("/settings")}
                            className="underline decoration-blue-200/80 underline-offset-4"
                          >
                            Go to Settings
                          </button>
                        )}
                      </p>
                    </div>
                  )}
                  {!googleError && googleConnected && (
                    <p className="text-xs text-slate-400">
                      {calendarSettings.include_locations
                        ? "Locations stay at city-level only."
                        : "Locations are hidden per your preferences."}
                    </p>
                  )}

                  {hasGoogleEvents ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {googleEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-blue-900/20"
                        >
                          <p className="text-sm font-semibold text-white">{event.label}</p>
                          <p className="text-xs text-slate-300">{event.window}</p>
                          {event.location && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                              <MapPin className="h-3 w-3 text-slate-300" />
                              {event.location}
                            </p>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                            onClick={() => insertCalendarEvent(event)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !googleError && (
                      <p className="text-sm text-slate-300">
                        No upcoming events were found in the next week. Try refreshing or adding a
                        new event to your calendar.
                      </p>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Upload className="h-5 w-5" />
              Create New Update
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Title
              </label>
              <Input
                placeholder="e.g., January 2024 Adventures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                What did you do this month?
              </label>
              <Textarea
                placeholder="Tell us about your experiences, achievements, travels, or anything memorable from this month..."
                value={userSummary}
                onChange={(e) => setUserSummary(e.target.value)}
                rows={6}
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Photos (optional)
              </label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="cursor-pointer border-white/10 bg-white/5 text-white file:text-white"
              />
              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {photoPreviews.map((src, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-inner shadow-blue-900/20"
                    >
                      <img
                        src={src}
                        alt={`Upload ${i + 1}`}
                        className="h-28 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <button
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute right-2 top-2 rounded-full bg-white/15 p-1 text-white backdrop-blur hover:bg-white/25"
                        aria-label="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 text-white shadow-glow transition-all hover:shadow-blue-500/40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving & Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save & Generate AI Summary
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {aiSummary && (
          <Card className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-blue-200" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-slate-100">{aiSummary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
