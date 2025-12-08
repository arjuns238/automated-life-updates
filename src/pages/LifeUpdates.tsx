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
  const [heroPhoto, setHeroPhoto] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryPhotoUrls, setSummaryPhotoUrls] = useState<string[]>([]);
  const [lastUpdateId, setLastUpdateId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
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
  const [integrationTab, setIntegrationTab] = useState<"overview" | "strava" | "spotify" | "calendar">("overview");

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
  const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroPhoto(file);
    setHeroPreview(URL.createObjectURL(file));
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

    setAiSummary(null);
    setSummaryPhotoUrls([]);
    setLastUpdateId(null);
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
        const enhancedSummary = `${userSummary.trim()}\n\nFocus on:\n- Weave these events into a cohesive recap\n- Call out fitness stats (distance/time) when relevant\n- Keep it upbeat and concise (1-2 sentences unless user specifies otherwise)`;
        const fd = new FormData();
        fd.append("user_summary", enhancedSummary);
        fd.append("update_id", String(data.id));
        if (heroPhoto) {
          fd.append("photos", heroPhoto, heroPhoto.name);
        }
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
        setSummaryPhotoUrls(summaryData.photo_urls || []);
        setLastUpdateId(data.id);
        localStorage.setItem("aiSummary", summaryData.ai_summary);
        localStorage.setItem("photo_urls", JSON.stringify(summaryData.photo_urls || []));
        localStorage.setItem("last_update_id", String(data.id));
        toast({
          title: "Summary ready to edit",
          description: "Review and save your AI summary below before publishing.",
        });
        navigate("/summary", {
          state: {
            aiSummary: summaryData.ai_summary,
            photo_urls: summaryData.photo_urls || [],
            update_id: data.id,
            selectedTrack,
          },
        });
      }

      // Reset form
      setTitle("");
      setUserSummary("");
      setHeroPhoto(null);
      setHeroPreview(null);
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

  const handlePublishSummary = async () => {
    if (!lastUpdateId || !aiSummary) {
      toast({
        title: "Nothing to save yet",
        description: "Generate and review an AI summary first.",
      });
      return;
    }
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from("life_updates")
        .update({ ai_summary: aiSummary, photos: summaryPhotoUrls })
        .eq("id", lastUpdateId);

      if (error) throw error;
      toast({
        title: "Summary saved",
        description: "Your AI summary has been saved to this update.",
      });
      navigate("/summary", {
        state: {
          aiSummary,
          photo_urls: summaryPhotoUrls,
          update_id: lastUpdateId,
          selectedTrack,
        },
      });
    } catch (error) {
      console.error("Error saving summary:", error);
      toast({
        title: "Could not save summary",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-100 flex flex-col items-center px-4 py-10 pb-48 md:py-12 md:pb-56">
      {isSubmitting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 text-white">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-base font-semibold">{loadingMessages[loadingStep]}</span>
            </div>
            <p className="max-w-xs text-sm text-gray-300">
              Hang tight, we&apos;re saving your update and crafting a recap.
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-8">
        <div className="space-y-1 px-1">
          <h1 className="text-3xl font-semibold text-white">Create new update</h1>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar px-1">
          {["overview", "strava", "spotify", "calendar"].map(tab => (
            <button
              key={tab}
              onClick={() => setIntegrationTab(tab as typeof integrationTab)}
              className={`flex-none px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                integrationTab === tab
                  ? "bg-white text-black shadow-lg shadow-white/15"
                  : "bg-[#18181b] border border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              {tab === "overview"
                ? "Overview"
                : tab === "strava"
                  ? "Strava"
                  : tab === "spotify"
                    ? "Spotify"
                    : "Calendar"}
            </button>
          ))}
        </div>

        {userId && (
          <div className="rounded-[2rem] border border-white/10 bg-[#18181b] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
              <div className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-cyan-300" />
                <p className="text-base font-semibold text-white">Recent activity</p>
              </div>
              <div className="text-xs text-gray-500">Tap + to add highlights to your update.</div>
            </div>

            <div className="space-y-4">
              {integrationTab === "strava" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-white">
                      <Activity className="h-5 w-5 text-cyan-300" />
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

                  {activitiesError && <p className="text-sm text-rose-200">{activitiesError}</p>}
                  {!activitiesError && stravaActivities.length === 0 && (
                    <p className="text-sm text-gray-300">
                      No recent Strava activities found. Try a refresh after your next workout.
                    </p>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {stravaActivities.map(a => (
                      <div
                        key={a.id}
                        className="group rounded-[1.75rem] border border-white/10 bg-[#16161c] p-4 shadow-inner shadow-black/30 transition hover:border-white/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold text-white leading-tight">{a.name}</p>
                            <p className="text-sm text-gray-300">
                              {a.type} · {formatDistance(a.distance)} · {formatTime(a.moving_time)}
                            </p>
                            <p className="text-xs text-gray-500">{new Date(a.start_date).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => insertActivity(a)}
                            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/15 transition"
                          >
                            Add
                          </button>
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
                      <p className="text-sm font-semibold">Spotify highlights</p>
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
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200/30 bg-black/20 px-3 py-2 text-sm text-emerald-50/90">
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
                          {spotifyTopTracks.map(t => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                            >
                              <div className="flex items-center gap-3">
                                {t.image ? (
                                  <img src={t.image} alt={t.name} className="h-10 w-10 rounded-md object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-emerald-900/40" />
                                )}
                                <div>
                                  <p className="text-base font-semibold text-white">{t.name}</p>
                                  <p className="text-sm text-emerald-50/80">{t.artists}</p>
                                  {t.album && <p className="text-xs text-emerald-50/70">{t.album}</p>}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/15"
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
                          {spotifyTopArtists.map(a => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                            >
                              <div className="flex items-center gap-3">
                                {a.image ? (
                                  <img src={a.image} alt={a.name} className="h-10 w-10 rounded-md object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-emerald-900/40" />
                                )}
                                <div>
                                  <p className="text-base font-semibold text-white">{a.name}</p>
                                  {a.genres && a.genres.length > 0 && (
                                    <p className="text-sm text-emerald-50/80">{a.genres.slice(0, 2).join(", ")}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/15"
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
                        {spotifyRecent.map(r => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex items-center gap-3">
                              {r.track.image ? (
                                <img src={r.track.image} alt={r.track.name} className="h-10 w-10 rounded-md object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-emerald-900/40" />
                              )}
                              <div>
                                <p className="text-base font-semibold text-white">{r.track.name}</p>
                                <p className="text-sm text-emerald-50/80">{r.track.artists}</p>
                                <p className="text-xs text-emerald-50/60">{new Date(r.played_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/15"
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
                    <p className="text-xs text-gray-400">
                      {calendarSettings.include_locations
                        ? "Locations stay at city-level only."
                        : "Locations are hidden per your preferences."}
                    </p>
                  )}
                  {hasGoogleEvents ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {googleEvents.map(event => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30"
                        >
                          <p className="text-base font-semibold text-white">{event.label}</p>
                          <p className="text-sm text-gray-300">{event.window}</p>
                          {event.location && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                              <MapPin className="h-3 w-3 text-gray-300" />
                              {event.location}
                            </p>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/15"
                            onClick={() => insertCalendarEvent(event)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !googleError && (
                      <p className="text-sm text-gray-300">
                        No upcoming events were found in the next week. Try refreshing or adding a new event to your calendar.
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-[2rem] border border-white/10 bg-[#18181b] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] space-y-6">
          <div className="flex gap-4 items-start">
            <label className="group relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1f1f24] to-[#0f0f13] flex items-center justify-center shrink-0 border border-white/10 cursor-pointer overflow-hidden">
              {heroPreview ? (
                <img src={heroPreview} alt="Hero preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="w-6 h-6 text-gray-500 group-hover:text-gray-300 transition" />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleHeroUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
            <div className="flex-1 space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brazil Adventure"
                className="w-full bg-transparent border-b border-gray-700 pb-2 text-lg font-semibold text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>

          <div className="space-y-5 pl-1">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Summary</h3>
              <Textarea
                placeholder="Tell us about your experiences, achievements, travels..."
                value={userSummary}
                onChange={e => setUserSummary(e.target.value)}
                rows={4}
                className="rounded-xl border border-gray-800 bg-[#0f0f13] text-sm text-gray-300 placeholder-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-700"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Photos</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {photoPreviews.map((src, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded-2xl bg-[#1f1f24] shrink-0 border border-white/10 overflow-hidden group"
                  >
                    <img src={src} alt={`Upload ${i + 1}`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                    <button
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white backdrop-blur hover:bg-black/70"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-2xl border border-dashed border-gray-700 shrink-0 flex items-center justify-center cursor-pointer bg-[#121218] hover:border-gray-500 transition">
                  <Upload className="w-5 h-5 text-gray-500" />
                  <Input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {aiSummary && (
          <Card className="rounded-[2rem] border border-white/5 bg-[#111117] shadow-2xl shadow-black/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                AI summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-gray-300">Edit anything you like, then save to continue.</p>
              <Textarea
                value={aiSummary}
                onChange={e => setAiSummary(e.target.value)}
                rows={5}
                className="rounded-2xl border border-white/10 bg-[#16161c] text-white placeholder:text-gray-500 focus:border-white/20 focus:ring-0"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handlePublishSummary}
                  disabled={isPublishing}
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>Save & view summary</>
                  )}
                </button>
                <span className="text-xs text-gray-400">Final summary shows as usual after save.</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.08em] text-gray-400">Preview</p>
                <p className="mt-2 leading-relaxed text-gray-100">{aiSummary}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed left-0 right-0 bottom-28 flex justify-center px-4 pointer-events-none z-40">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="pointer-events-auto w-full max-w-md h-14 rounded-full bg-white text-black font-semibold shadow-2xl shadow-white/10 flex items-center justify-center gap-2 transition hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving & generating summary...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Save & generate AI summary
            </>
          )}
        </button>
      </div>
    </div>
  );
}
