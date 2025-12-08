import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { API_BASE_URL } from "@/lib/apiBase";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  Loader2,
  MapPin,
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
  photo_urls?: string[] | null;
  hero_photo_url?: string | null;
};

type WrapResponse = {
  month_label: string;
  ai_summary: string;
  strava: StravaSummary;
  music: MusicSummary;
  calendar: CalendarSummary;
  life_updates: LifeUpdateSnippet[];
  hero_photo_url?: string | null;
  photo_urls?: string[] | null;
  mood_hint?: string | null;
  category_focus?: string[] | null;
};

type LocationState = {
  wrap?: WrapResponse;
  generatedAt?: string | null;
  scrollY?: number;
};

const STORAGE_KEY = "this-month-wrap";
const HYDRATED_PHOTOS_KEY = "wrap-hydrated-photos";

const LoadingState = () => {
  const messages = [
    "We’re collecting this month’s best memories…",
    "Stitching together your highlights with a little magic",
    "Almost there. Polishing your recap to feel just right.",
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length);
    }, 2200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="relative flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-lg backdrop-blur overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded-full bg-white/10 animate-pulse" />
          <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
      <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-[pulse_1.5s_ease_in_out_infinite]" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-16 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
          />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-white/10 animate-pulse" />
        <div className="h-3 w-full rounded-full bg-white/5 animate-pulse" />
        <div className="h-3 w-5/6 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="h-10 flex-1 rounded-full border border-white/10 bg-white/5 animate-pulse" />
        <div className="h-10 w-28 rounded-full border border-white/10 bg-white/10 animate-pulse" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="max-w-xs rounded-2xl bg-black/70 px-5 py-4 text-white text-sm font-medium shadow-2xl shadow-black/60 border border-white/10 text-center animate-[fade_0.6s_ease]">
          {messages[msgIndex]}
        </div>
      </div>
    </div>
  );
};

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-rose-300/30 bg-rose-300/10 p-10 text-rose-50 shadow-lg backdrop-blur">
    <p className="text-sm text-center">{message}</p>
  </div>
);

export default function ThisMonthWrap() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (location.state || {}) as LocationState;

  const cached = useMemo(() => {
    if (locationState.wrap) {
      return { wrap: locationState.wrap, generatedAt: locationState.generatedAt || null };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { wrap?: WrapResponse; generatedAt?: string };
      if (!parsed?.wrap) return null;
      return { wrap: parsed.wrap, generatedAt: parsed.generatedAt || null };
    } catch {
      return null;
    }
  }, [locationState.generatedAt, locationState.wrap]);

  const hadWrapInitially = Boolean(cached?.wrap);
  const [wrap, setWrap] = useState<WrapResponse | null>(cached?.wrap ?? null);
  const [wrapGeneratedAt, setWrapGeneratedAt] = useState<string | null>(cached?.generatedAt ?? null);
  const [loading, setLoading] = useState(!cached?.wrap);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydratedPhotos, setHydratedPhotos] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(HYDRATED_PHOTOS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [hydratedHero, setHydratedHero] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const returnScroll = locationState.scrollY;
  const [regenPrompt, setRegenPrompt] = useState("");
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [highlightTouchStart, setHighlightTouchStart] = useState<number | null>(null);

  const fetchWrap = async (userPrompt?: string) => {
    if (hadWrapInitially && !userPrompt) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to see your wrap.");
        return;
      }

      const url = new URL(`${API_BASE_URL}/api/wrap/this-month`);
      url.searchParams.set("user_id", user.id);
      if (userPrompt) {
        url.searchParams.set("user_prompt", userPrompt);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to load wrap (${res.status})`);
      }
      const json = (await res.json()) as WrapResponse;
      setWrap(json);
      const generatedAt = new Date().toISOString();
      setWrapGeneratedAt(generatedAt);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ wrap: json, generatedAt }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not fetch your wrap.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchWrap();
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

  const categoryImages: Record<string, string> = {
    fitness:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
    travel:
      "https://plus.unsplash.com/premium_photo-1719843013722-c2f4d69db940?auto=format&fit=crop&w=1200&q=80", // island backdrop
    music:
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=80",
    social:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    work:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    reflective:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  };

  const gradientByMood: Record<string, string> = {
    calm: "linear-gradient(180deg, #0b1d2a 0%, #0a2f2f 100%)",
    energetic: "linear-gradient(180deg, #2a0d0d 0%, #3a1030 100%)",
    reflective: "linear-gradient(180deg, #1b102a 0%, #0c1328 100%)",
    neutral: "linear-gradient(180deg, #0f0f11 0%, #0a0a0c 100%)",
    growth: "linear-gradient(180deg, #0d2a20 0%, #0a2f2a 100%)",
  };

  const getHighlightCardStyle = (idx: number, total: number) => {
    const position = (idx - highlightIndex + total) % total;
    if (position === 0) {
      return {
        zIndex: 30,
        opacity: 1,
        transform: "translateX(0) scale(1)",
      };
    }
    if (position === 1) {
      return {
        zIndex: 10,
        opacity: 0.7,
        transform: "translateX(25px) scale(0.92) rotate(3deg)",
      };
    }
    if (position === total - 1) {
      return {
        zIndex: 10,
        opacity: 0.7,
        transform: "translateX(-25px) scale(0.92) rotate(-3deg)",
      };
    }
    return { zIndex: 0, opacity: 0, transform: "scale(0.8)" };
  };

  const openSummary = (item?: LifeUpdateSnippet) => {
    if (!item?.id) return;
    setOpeningId(item.id);
    try {
      const anyItem = item as unknown as { photos?: string[] | null };
      const photos = item.photo_urls || anyItem.photos || [];
      const aiSummary = item.snippet || "";
      const currentScroll = window.scrollY;
      navigate("/summary", {
        state: {
          aiSummary,
          photo_urls: photos,
          update_id: item.id,
          fromWrap: true,
          fromScroll: currentScroll,
        },
      });
    } finally {
      setOpeningId(null);
    }
  };

  const handleHighlightTouchStart = (clientX: number) => {
    setHighlightTouchStart(clientX);
  };

  const handleHighlightTouchEnd = (clientX: number, total: number) => {
    if (highlightTouchStart === null || total <= 1) return;
    const deltaX = clientX - highlightTouchStart;
    const threshold = 40;
    if (deltaX > threshold) {
      setHighlightIndex(prev => (prev - 1 + total) % total);
    } else if (deltaX < -threshold) {
      setHighlightIndex(prev => (prev + 1) % total);
    }
    setHighlightTouchStart(null);
  };

  const deriveCategoryScores = (data: WrapResponse | null) => {
    if (!data) return {};
    const summaryText = (data.ai_summary || "").toLowerCase();
    const isFutureHint = /soon|planning|plan to|would love|want to go|hope to/i.test(data.ai_summary || "");
    const scores: Record<string, number> = {
      fitness: Math.min(1, (data.strava.total_activities + data.strava.total_distance_km / 10) / 5),
      music: Math.min(1, data.music.total_minutes_listened / 600),
      social: Math.min(1, (data.calendar.highlights?.length || 0) / 4),
      travel: !isFutureHint && /travel|trip|city|flight|vacation/i.test(summaryText) ? 0.7 : 0,
      work: /work|project|team|meeting/i.test(summaryText) ? 0.6 : 0,
      reflective: /reflect|quiet|calm|reset|pause/i.test(summaryText) ? 0.6 : 0,
    };
    (data.category_focus || []).forEach(cat => {
      if (scores[cat] !== undefined) scores[cat] = Math.max(scores[cat], 0.8);
    });
    return scores;
  };

  const deriveMood = (data: WrapResponse | null) => {
    if (!data) return "neutral";
    if (data.mood_hint) return data.mood_hint;
    const text = (data.ai_summary || "").toLowerCase();
    if (text.match(/calm|peace|steady|grounded/)) return "calm";
    if (text.match(/excited|energ|momentum|busy/)) return "energetic";
    if (text.match(/reflect|introspect|quiet/)) return "reflective";
    if (text.match(/grow|change|progress/)) return "growth";
    return "neutral";
  };

  const selectBackdrop = (data: WrapResponse | null) => {
    const photos =
      data?.photo_urls?.filter(Boolean) ||
      data?.life_updates?.flatMap(u => u.photo_urls || []).filter(Boolean) ||
      [];
    const hero = data?.hero_photo_url || photos[0];
    const mood = deriveMood(data);
    const categories = deriveCategoryScores(data);
    const strongest = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    if (hero) {
      return { mode: "photo", url: hero };
    }

    if (strongest && strongest[1] >= 0.4) {
      const mapped =
        categoryImages[strongest[0]] ||
        categoryImages[
          ["fitness", "travel", "music", "social", "work", "reflective"].find(k => categoryImages[k])!
        ];
      return { mode: "curated", url: mapped };
    }

    return { mode: "gradient", gradient: gradientByMood[mood] || gradientByMood.neutral };
  };

  const effectiveWrap = useMemo(() => {
    if (!wrap) return null;
    const aggregatedFromUpdates =
      wrap.life_updates
        ?.flatMap(u => {
          const anyU = u as unknown as { photos?: string[] | null };
          return u.photo_urls || anyU.photos || [];
        })
        .filter(Boolean) || [];
    const photos =
      (wrap.photo_urls?.length ? wrap.photo_urls : []) ||
      [];
    const combinedPhotos = (photos.length ? photos : aggregatedFromUpdates).filter(Boolean);
    const hero =
      wrap.hero_photo_url ||
      (combinedPhotos.length ? combinedPhotos[0] : null) ||
      hydratedHero ||
      null;
    const finalPhotos = combinedPhotos.length ? combinedPhotos : hydratedPhotos;
    return { ...wrap, photo_urls: finalPhotos, hero_photo_url: hero };
  }, [wrap, hydratedPhotos, hydratedHero]);

  const backdrop = useMemo(() => selectBackdrop(effectiveWrap), [effectiveWrap]);

  useEffect(() => {
    if (wrap?.life_updates?.length) {
      // Debug: list the summaries the wrap is using
      console.info(
        "[Wrap debug] life_updates used for wrap:",
        wrap.life_updates.map(u => ({
          id: u.id,
          title: u.title,
          snippet: u.snippet,
          created_at: u.created_at,
        }))
      );
    }
    if (wrap) {
      console.info("[Wrap debug] hero_photo_url:", wrap.hero_photo_url || null);
      console.info("[Wrap debug] wrap.photo_urls:", wrap.photo_urls || null);
      console.info(
        "[Wrap debug] life_updates photo_urls:",
        wrap.life_updates?.map(u => {
          const anyU = u as unknown as { photos?: string[] | null };
          return { id: u.id, photo_urls: u.photo_urls || anyU.photos || null };
        })
      );
    }
  }, [wrap?.life_updates]);

  useEffect(() => {
    if (returnScroll !== undefined) {
      window.scrollTo({ top: returnScroll, behavior: "auto" });
    }
  }, [returnScroll, loading]);

  // Fallback: if wrap came without photos, try to hydrate from Supabase directly
  useEffect(() => {
    const needsHydration =
      (wrap?.photo_urls?.length || 0) === 0 &&
      (!wrap?.hero_photo_url) &&
      (hydratedPhotos.length === 0 || hydratedHero === null);
    if (!needsHydration) return;

    const fetchPhotos = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

        const { data, error } = await supabase
          .from("life_updates")
          .select("id, photos")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) {
          console.warn("Could not hydrate wrap photos:", error.message);
          return;
        }

        const collected: string[] = [];
        (data || []).forEach(row => {
          const photos = (row.photos as string[] | null) || [];
          photos.filter(Boolean).forEach(p => collected.push(p));
        });

        if (collected.length) {
          setHydratedPhotos(collected);
          setHydratedHero(collected[0]);
          localStorage.setItem(HYDRATED_PHOTOS_KEY, JSON.stringify(collected));
        }
      } catch (e) {
        console.warn("Hydration fetch failed:", e);
      }
    };

    fetchPhotos();
  }, [wrap, hydratedPhotos.length, hydratedHero]);

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

  const fallbackHero =
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 md:px-10 py-10">
      <div className="w-full max-w-[440px] md:max-w-[1200px] bg-[#0c0e14] md:bg-[#0c0e14] rounded-[2rem] md:rounded-[1.5rem] overflow-hidden shadow-2xl md:shadow-lg relative border border-white/10 ring-1 ring-white/10 flex flex-col md:min-h-screen">
        <div className="relative h-[360px] md:h-[420px] w-full shrink-0 overflow-hidden">
          {backdrop.mode === "gradient" ? (
            <div
              className="w-full h-full"
              style={{ backgroundImage: backdrop.gradient }}
            />
          ) : (
            <img
              src={backdrop.url || fallbackHero}
              alt="Monthly wrap hero"
              className="w-full h-full object-cover"
              style={{ objectPosition: "50% 40%" }}
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14] via-[#0c0e14]/40 to-transparent" />

          <div className="absolute top-6 left-6 right-6 flex justify-end items-center z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-xs font-medium text-white border border-white/10">
              <Wand2 className="h-4 w-4" />
              {wrapGeneratedAt
                ? new Date(wrapGeneratedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "AI crafted"}
              {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </div>
          </div>

          <div className="absolute bottom-6 left-6 z-10">
            <h1 className="text-3xl font-semibold text-white tracking-tight mb-1">
              {effectiveWrap?.month_label || "Your month"}
            </h1>
            <div className="flex items-center text-gray-300 gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">Crafted for you</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-10 pt-6 relative z-20 md:pb-16">
          {loading && <LoadingState />}
          {!loading && !effectiveWrap && error && <ErrorState message={error} />}

          {!loading && effectiveWrap && (
            <div className="flex flex-col gap-8 pt-4">
              {error && (
                <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-50">
                  Showing your cached wrap. Refresh failed: {error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1c1f2a] border border-[#2a2e3d] rounded-2xl p-3 flex flex-col justify-center">
                  <span className="text-xs font-medium text-gray-400 mb-1">Strava</span>
                  <span className="text-[0.9375rem] font-semibold text-white tracking-tight">
                    {stravaLabel}
                  </span>
                </div>
                <div className="bg-[#1c1f2a] border border-[#2a2e3d] rounded-2xl p-3 flex flex-col justify-center">
                  <span className="text-xs font-medium text-gray-400 mb-1">Music</span>
                  <span className="text-[0.9375rem] font-semibold text-white tracking-tight">
                    {musicLabel || `${effectiveWrap.music.total_minutes_listened} mins`}
                  </span>
                </div>
                <div className="bg-[#1c1f2a] border border-[#2a2e3d] rounded-2xl p-3 flex flex-col justify-center">
                  <span className="text-xs font-medium text-gray-400 mb-1">Calendar</span>
                  <span className="text-[0.9375rem] font-semibold text-white tracking-tight">
                    {(effectiveWrap.calendar.highlights?.length || 0) > 0
                      ? `${effectiveWrap.calendar.highlights.length} highlight${
                          effectiveWrap.calendar.highlights.length > 1 ? "s" : ""
                        }`
                      : "No highlights"}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-3 tracking-tight">About</h2>
                <p className="text-[0.9375rem] text-gray-400 leading-relaxed font-normal whitespace-pre-line">
                  {effectiveWrap.ai_summary}
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white mb-4 tracking-tight">Top highlights</h2>
                <div
                  className="relative w-full h-[300px] flex justify-center items-center"
                  style={{ perspective: "1000px" }}
                  onTouchStart={e => handleHighlightTouchStart(e.touches[0].clientX)}
                  onTouchEnd={e =>
                    handleHighlightTouchEnd(
                      e.changedTouches[0].clientX,
                      effectiveWrap.life_updates?.length || 0
                    )
                  }
                >
                  {effectiveWrap.life_updates && effectiveWrap.life_updates.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setHighlightIndex(prev =>
                            (prev - 1 + effectiveWrap.life_updates.length) %
                            effectiveWrap.life_updates.length
                          )
                        }
                        className="absolute left-2 z-40 w-10 h-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg text-white hover:bg-black/80 transition-colors"
                        aria-label="Previous highlight"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setHighlightIndex(prev =>
                            (prev + 1) % effectiveWrap.life_updates.length
                          )
                        }
                        className="absolute right-2 z-40 w-10 h-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg text-white hover:bg-black/80 transition-colors"
                        aria-label="Next highlight"
                      >
                        <ChevronLeft className="w-5 h-5 rotate-180" />
                      </button>
                    </>
                  )}
                  <div className="relative w-full h-full flex justify-center items-center">
                    {(effectiveWrap.life_updates && effectiveWrap.life_updates.length > 0
                      ? effectiveWrap.life_updates
                      : [{ id: "placeholder", title: "Your updates will appear here" }]
                    ).map((item, idx) => {
                      const anyItem = item as unknown as { photos?: string[] | null };
                      const cardPhoto = item.photo_urls?.[0] || anyItem.photos?.[0] || effectiveWrap.hero_photo_url;
                      return (
                        <div
                          key={item.id || idx}
                          className="absolute w-[320px] h-[240px] rounded-[1.5rem] overflow-hidden shadow-2xl shadow-black/50 transition-all duration-[600ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] border border-white/10 bg-gradient-to-br from-[#1c1f2a] via-[#161821] to-[#10121a] p-0 cursor-pointer"
                          style={getHighlightCardStyle(idx, Math.max(1, effectiveWrap.life_updates?.length || 1))}
                          onClick={() => openSummary(item)}
                        >
                          {cardPhoto && (
                            <div
                              className="absolute inset-0 bg-cover bg-center scale-105"
                              style={{ backgroundImage: `url(${cardPhoto})` }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                          <div className="relative z-10 h-full w-full p-5 flex flex-col justify-between">
                            <div className="flex flex-col gap-2">
                              <p className="text-xs uppercase tracking-[0.12em] text-gray-300">
                                {item.created_at
                                  ? new Date(item.created_at).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "Update"}
                              </p>
                              <h3 className="text-xl font-semibold text-white truncate">
                                {item.title || "Untitled update"}
                              </h3>
                              <p className="text-sm text-gray-200 leading-relaxed line-clamp-4">
                                {item.snippet || "No summary yet."}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-200">
                                {openingId === item.id ? "Opening..." : "Tap to view"}
                              </span>
                              <div className="w-9 h-9 rounded-full bg-white/15 border border-white/10 flex items-center justify-center text-white">
                                <ChevronLeft className="w-4 h-4 rotate-180" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#10121a] p-4">
                <div className="text-sm text-gray-200">
                  Ready to share your month? Grab this wrap and post it anywhere.
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
            </div>
          )}
        </div>
      </div>
      <div className="w-full max-w-[440px] md:max-w-[1200px] mt-10 mb-36 px-1 flex flex-col items-center gap-3">
        <p className="text-lg font-semibold text-white text-center">
          Didn&apos;t like this? Regenerate your wrap
        </p>
        {!showRegenInput ? (
          <Button
            variant="ghost"
            className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/15"
            onClick={() => setShowRegenInput(true)}
          >
            Regenerate
          </Button>
        ) : (
          <div className="w-full max-w-xl space-y-3">
            <p className="text-sm text-gray-300 text-center">
              Tell us how you would like this wrap to be written
            </p>
            <textarea
              value={regenPrompt}
              onChange={e => setRegenPrompt(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 text-white placeholder-gray-500 p-3 focus:outline-none focus:ring-2 focus:ring-white/20"
              rows={3}
              placeholder="e.g., Focus on workouts and keep the tone upbeat but concise."
            />
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                className="bg-white text-slate-900 shadow-md hover:bg-slate-100"
                disabled={regenerating}
                onClick={() => {
                  setRegenerating(true);
                  fetchWrap(regenPrompt.trim() || undefined);
                }}
              >
                {regenerating ? "Regenerating..." : "Submit & regenerate"}
              </Button>
              <Button
                variant="ghost"
                className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/15"
                onClick={() => {
                  setShowRegenInput(false);
                  setRegenPrompt("");
                }}
                disabled={regenerating}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
