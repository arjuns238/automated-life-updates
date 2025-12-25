import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Loader2,
  Upload,
  Sparkles,
  X,
  Music2,
  Headphones,
  CalendarDays,
  MapPin,
  Images,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Wand2,
} from "lucide-react";
import { getSpotifyStatus } from "@/integrations/spotify/auth";
import { getStravaStatus } from "@/integrations/strava/auth";
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
  const [stravaConnected, setStravaConnected] = useState<boolean | null>(null);
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
  const [activeMoment, setActiveMoment] = useState(0);
  const [momentNotes, setMomentNotes] = useState<Record<string, string>>({});
  const loadingMessages = [
    "Saving your update...",
    "Organizing the details...",
    "Drafting your summary...",
    "Adding finishing touches...",
  ];
  const memoryPrompts = [
    "What was happening here?",
    "Who were you with?",
    "What did this day feel like?",
    "A detail you'll want to remember?",
    "Why does this moment matter?",
  ];
  const fallbackMomentImage =
    "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80";
  const { toast } = useToast();

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
      try {
        const status = await getStravaStatus(uid);
        setStravaConnected(status.connected);
        if (!status.connected) {
          setStravaActivities([]);
          setActivitiesError("Strava not connected. Connect to pull workouts.");
          return;
        }
      } catch (statusError) {
        console.warn("Could not verify Strava status", statusError);
      }

      const res = await fetch(`${API_BASE_URL}/api/strava/activities?user_id=${encodeURIComponent(uid)}&per_page=5`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403) {
          setStravaConnected(false);
          throw new Error("Strava not connected. Connect in Settings to pull workouts.");
        }
        throw new Error(text || `Failed with ${res.status}`);
      }
      const data = await res.json();
      // backend returns { items: [], ... } in router; fallback to array
      const items: StravaActivity[] = Array.isArray(data) ? data : data.items || [];
      setStravaActivities(items);
      setStravaConnected(true);
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

  const momentSources = useMemo(() => {
    const merged = heroPreview ? [heroPreview, ...photoPreviews] : [...photoPreviews];
    if (merged.length === 0) {
      return [
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80", // mountain lake
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", // forest trail
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", // ocean waves
      ];
    }
    return merged;
  }, [heroPreview, photoPreviews]);

  const hasUserPhotos = heroPreview !== null || photoPreviews.length > 0;
  const isPlaceholderGallery = !hasUserPhotos;
  const currentMomentKey = momentSources[activeMoment] || "placeholder";
  const currentPrompt = memoryPrompts[activeMoment % memoryPrompts.length];
  const currentNote = userSummary;

  useEffect(() => {
    if (activeMoment > momentSources.length - 1) {
      setActiveMoment(0);
    }
  }, [momentSources.length, activeMoment]);

  const handleMomentNoteChange = (value: string) => {
    setMomentNotes(prev => ({ ...prev, [currentMomentKey]: value }));
    setUserSummary(value);
  };

  const addNoteToRecap = () => {
    const trimmed = currentNote.trim();
    if (!trimmed) return;
    setUserSummary(trimmed);
  };

  const compileSummary = () => {
    return userSummary.trim();
  };

  const handleSubmit = async () => {
    const compiledSummary = compileSummary();
    if (!title.trim() || !compiledSummary) {
      toast({
        title: "Missing information",
        description: "Please provide a title and add at least one moment or note",
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
          user_summary: compiledSummary,
          // photos: photos,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate AI summary using Python backend
      let summaryData = null;
      let summaryError = null;

      try {
        const enhancedSummary = `${compiledSummary}\n\nFocus on:\n- Weave these events into a cohesive recap\n- Call out fitness stats (distance/time) when relevant\n- Keep it upbeat and concise (1-2 sentences unless user specifies otherwise)`;
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
    <div className="min-h-screen bg-[#000000] text-gray-100 flex flex-col items-center px-4 py-10 pb-48 md:py-12 md:pb-56">
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

      <div className="w-full max-w-5xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Life recap builder</p>
            <h1 className="text-3xl font-semibold text-white">Remember your month, one moment at a time</h1>
            <p className="text-sm text-gray-400">
              We&apos;ve collected all your memories and put them in one place. Scroll your photos, react to prompts, drop context and we&apos;ll stitch the rest.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full border border-white/10 bg-white text-black hover:bg-gray-200"
            onClick={() => navigate("/wrap")}
          >
            View wrap
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.6fr,1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[#0d0d12] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Images className="h-5 w-5 text-cyan-300" />
                <p className="text-base font-semibold">Photo-first capture</p>
              </div>
              <span className="text-xs text-gray-400">
                {isPlaceholderGallery ? "Sample placeholders" : "Your shots"} · {activeMoment + 1} /{" "}
                {momentSources.length}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Upload your own photos to customize this, or we can pull the most relevant moments for you.
            </p>

            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black/40">
              <img
                src={momentSources[activeMoment]}
                alt="Moment"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
                data-fallback="false"
                onError={e => {
                  if (e.currentTarget.dataset.fallback === "true") return;
                  e.currentTarget.src = fallbackMomentImage;
                  e.currentTarget.dataset.fallback = "true";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-md">
                <MessageCircle className="h-4 w-4" />
                <span>Swipe through your month</span>
              </div>
              {isPlaceholderGallery && (
                <div className="absolute top-4 right-4 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
                  Placeholder
                </div>
              )}
              <button
                onClick={() => setActiveMoment(prev => (prev - 1 + momentSources.length) % momentSources.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white backdrop-blur hover:bg-black/85"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveMoment(prev => (prev + 1) % momentSources.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white backdrop-blur hover:bg-black/85"
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/65 p-3 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-300">Prompt</p>
                <p className="text-white font-semibold text-lg leading-tight mt-1">{currentPrompt}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Textarea
                value={currentNote}
                onChange={e => handleMomentNoteChange(e.target.value)}
                rows={3}
                placeholder="Add a line or two about this moment..."
                className="rounded-2xl border border-white/10 bg-[#0c0c12] text-sm text-gray-100 placeholder:text-gray-500 focus:border-white/20 focus:ring-0"
              />
              <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                Add a line about who, where, or why this mattered.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={addNoteToRecap}
                  className="rounded-full bg-white text-black hover:bg-gray-200"
                  variant="secondary"
                  size="sm"
                >
                  Drop into recap
                </Button>
                <Button
                  onClick={() => setActiveMoment(prev => (prev + 1) % momentSources.length)}
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  Next moment
                </Button>
                {/* <p className="text-xs text-gray-400">Every note lands in your recap builder below.</p> */}
              </div>
            </div>

            {(stravaActivities.length > 0 || hasSpotifyData || hasGoogleEvents) && (
              <div className="space-y-3 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Activity className="h-4 w-4 text-cyan-300" />
                    <p className="text-base font-semibold">Suggested moments</p>
                  </div>
                  <span className="text-xs text-gray-400">Tap to drop into recap</span>
                </div>

                {stravaActivities.length > 0 ? (
                  <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 space-y-2">
                    <p className="text-sm font-semibold text-white">Most recent workout</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">{stravaActivities[0].name}</p>
                          <p className="text-xs text-gray-400">
                            {stravaActivities[0].type} · {formatDistance(stravaActivities[0].distance)} ·{" "}
                            {formatTime(stravaActivities[0].moving_time)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                          onClick={() => insertActivity(stravaActivities[0])}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 space-y-2">
                    <p className="text-sm font-semibold text-white">Strava not connected</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full border border-white/10 bg-white/5 px-4 text-xs text-white hover:bg-white/10"
                      onClick={() => navigate("/settings")}
                    >
                      Connect Strava
                    </Button>
                  </div>
                )}

                {hasSpotifyData && spotifyTopTracks[0] ? (
                  <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 space-y-2">
                    <p className="text-sm font-semibold text-white">Top song</p>
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{spotifyTopTracks[0].name}</p>
                        <p className="text-xs text-emerald-50/80">{spotifyTopTracks[0].artists}</p>
                        {spotifyTopTracks[0].album && (
                          <p className="text-[11px] text-emerald-50/70">{spotifyTopTracks[0].album}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                        onClick={() => insertTrack(spotifyTopTracks[0], "Top track")}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 space-y-2">
                    <p className="text-sm font-semibold text-white">Spotify not connected</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full border border-white/10 bg-white/5 px-4 text-xs text-white hover:bg-white/10"
                      onClick={() => navigate("/settings")}
                    >
                      Connect Spotify in Settings
                    </Button>
                  </div>
                )}

                {hasGoogleEvents && (
                  <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 space-y-2">
                    <p className="text-sm font-semibold text-white">Calendar moments</p>
                    <div className="space-y-2">
                      {googleEvents.map(event => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-white leading-tight">{event.label}</p>
                            <p className="text-xs text-gray-400">{event.window}</p>
                            {event.location && (
                              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                            onClick={() => insertCalendarEvent(event)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Wand2 className="h-4 w-4 text-cyan-200" />
                <span>Upload more photos to make this feel like a slideshow.</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-white/20 px-3 py-1.5 text-sm text-white hover:border-white/40">
                  <Upload className="h-4 w-4" />
                  Add photos
                  <Input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#111118] p-4 shadow-lg shadow-black/40 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Wrap details</p>
                  <p className="text-base text-white font-semibold">Title & hero</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-gray-200">
                  {/* Optional hero */}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="group relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1f1f24] to-[#0f0f13] flex items-center justify-center shrink-0 border border-white/10 cursor-pointer overflow-hidden">
                  {heroPreview ? (
                    <img src={heroPreview} alt="Hero preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Give this update a name"
                    className="w-full bg-transparent border-b border-gray-700 pb-2 text-lg font-semibold text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Recap textarea intentionally removed per new flow */}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#111118] p-4 shadow-lg shadow-black/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Activity className="h-4 w-4 text-orange-200" />
                <p className="text-base font-semibold">Recent workouts</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => userId && fetchStravaActivities(userId)}
                disabled={activitiesLoading}
              >
                {activitiesLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            {activitiesError && (
              <div className="flex items-start gap-2 rounded-xl border border-orange-200/30 bg-black/20 px-3 py-2 text-sm text-orange-50/90">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-orange-200" />
                <p className="flex flex-wrap items-center gap-1">
                  <span>{activitiesError}</span>
                  <button
                    onClick={() => navigate("/settings")}
                    className="underline decoration-orange-200/80 underline-offset-4"
                  >
                    Go to Settings
                  </button>
                </p>
              </div>
            )}
            {!activitiesError && stravaActivities.length === 0 && (
              <p className="text-sm text-gray-300">No recent Strava activities yet.</p>
            )}
            <div className="space-y-2">
              {stravaActivities.slice(0, 4).map(a => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{a.name}</p>
                    <p className="text-xs text-gray-400">
                      {a.type} · {formatDistance(a.distance)} · {formatTime(a.moving_time)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                    onClick={() => insertActivity(a)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#111118] p-4 shadow-lg shadow-black/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Music2 className="h-4 w-4 text-emerald-200" />
                <p className="text-base font-semibold">Listening & events</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => {
                  if (userId) {
                    fetchSpotifyData(userId);
                    fetchGoogleData(userId);
                  }
                }}
                disabled={spotifyLoading || googleLoading}
              >
                {spotifyLoading || googleLoading ? "Refreshing..." : "Refresh"}
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
              <div className="space-y-2">
                {spotifyTopTracks.slice(0, 2).map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {t.image ? (
                        <img src={t.image} alt={t.name} className="h-9 w-9 rounded-md object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-emerald-900/40" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-emerald-50/80">{t.artists}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full border border-white/10 bg-white/10 px-3 text-xs text-white hover:bg-white/15"
                      onClick={() => insertTrack(t, "Top track")}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!spotifyError && !hasSpotifyData && (
              <p className="text-sm text-gray-300">Connect Spotify in Settings to pull music moments.</p>
            )}

            {hasGoogleEvents && (
              <div className="space-y-2">
                {googleEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{event.label}</p>
                      <p className="text-xs text-gray-400">{event.window}</p>
                      {event.location && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                      onClick={() => insertCalendarEvent(event)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!googleError && !hasGoogleEvents && (
              <p className="text-sm text-gray-300">Calendar looks quiet. Add events or refresh.</p>
            )}
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
