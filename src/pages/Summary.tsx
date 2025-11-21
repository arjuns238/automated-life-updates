import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Share2, Heart, MessageCircle, Repeat2 } from "lucide-react";
import { Activity } from "lucide-react";

/** Extract #hashtags (simple) and return [cleanText, hashtags[]] */
function splitHashtags(text: string): { clean: string; tags: string[] } {
  if (!text) return { clean: "", tags: [] };
  const tags = Array.from(new Set((text.match(/#\w+/g) || []).map(t => t.trim())));
  const clean = text.replace(/\s*#\w+\s*/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return { clean, tags };
}

/** 1–4 image layouts, with nice vibes */
function MediaGrid({ photos }: { photos: string[] }) {
  const imgs = photos.slice(0, 4);
  if (imgs.length === 0) return null;

  if (imgs.length === 1) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border bg-muted/10 group">
        <img
          src={imgs[0]}
          alt="attachment 1"
          className="w-full h-auto max-h-[380px] object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:max-h-[520px]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (imgs.length === 2) {
    return (
      <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border bg-muted/10">
        {imgs.map((src, i) => (
          <div key={i} className="relative group">
            <img
              src={src}
              alt={`attachment ${i + 1}`}
              className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-64"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
    );
  }

  if (imgs.length === 3) {
    // 1 big on left, 2 stacked on right
    return (
      <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border bg-muted/10">
        <div className="relative group">
          <img
            src={imgs[0]}
            alt="attachment 1"
            className="col-span-1 w-full h-[260px] object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-[328px]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="col-span-1 grid grid-rows-2 gap-1">
          {imgs.slice(1).map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`attachment ${i + 2}`}
                className="w-full h-[130px] object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-[163px]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4 images
  return (
    <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border bg-muted/10">
      {imgs.map((src, i) => (
        <div key={i} className="relative group">
          <img
            src={src}
            alt={`attachment ${i + 1}`}
            className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-48"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ))}
    </div>
  );
}

type LocationState = {
  aiSummary?: string;
  photo_urls?: string[];
  selectedTrack?: {
    id: string;
    name: string;
    artists: string;
    album?: string;
    image?: string;
    preview_url?: string;
    url?: string;
  } | null;
};

export default function Summary() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  // text
  const aiSummary =
    state.aiSummary ?? localStorage.getItem("aiSummary") ?? "";

  // photos
  const photos: string[] = useMemo(() => {
    if (Array.isArray(state.photo_urls) && state.photo_urls.length) {
      return state.photo_urls.filter(Boolean);
    }
    try {
      const raw = localStorage.getItem("photo_urls");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [state.photo_urls]);

  const selectedTrack = useMemo(() => {
    if (state.selectedTrack) return state.selectedTrack;
    try {
      const raw = localStorage.getItem("selected_track");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [state.selectedTrack]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  const attachAudio = (url: string) => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("play", () => {
      setIsPlaying(true);
      setPlayError(null);
    });
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    return audio;
  };

  useEffect(() => {
    if (!selectedTrack?.preview_url) {
      setIsPlaying(false);
      return;
    }
    const audio = attachAudio(selectedTrack.preview_url);

    // Try to autoplay the preview in the background; browsers may block without prior interaction.
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [selectedTrack]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const togglePlay = () => {
    if (!selectedTrack) return;
    if (selectedTrack.preview_url) {
      if (!audioRef.current) {
        attachAudio(selectedTrack.preview_url);
      }
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            setPlayError(null);
          })
          .catch((err) => {
            console.warn("Preview playback blocked:", err);
            setPlayError("Tap Play to start the preview (your browser blocked autoplay).");
            setIsPlaying(false);
          });
      }
    } else if (selectedTrack.url) {
      window.open(selectedTrack.url, "_blank", "noopener,noreferrer");
    }
  };

  const { clean, tags } = splitHashtags(aiSummary);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50 md:min-h-[calc(100vh-5rem)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_25%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#ffffff0f_1px,transparent_0)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 pb-[6.5rem] sm:px-6 sm:pb-12 md:pb-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/home")}
              className="rounded-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100 shadow-inner shadow-blue-500/10">
              <Sparkles className="h-4 w-4" />
              Your Summary
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80 md:text-sm">
              <Activity className="h-4 w-4 text-green-300" />
              Freshly generated
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        <Card className="border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 opacity-30 blur-md" />
                <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-hero text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold leading-none text-white">
                    Your AI Recap
                  </CardTitle>
                  <span className="text-xs text-slate-300">· just now</span>
                </div>
                <div className="text-xs text-slate-400">crafted privately for you</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-4 pl-1 sm:pl-14">
              {selectedTrack && (
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner shadow-emerald-900/20 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {selectedTrack.image ? (
                      <img
                        src={selectedTrack.image}
                        alt={selectedTrack.name}
                        className="h-12 w-12 rounded-xl object-cover shadow-lg shadow-emerald-900/30"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-emerald-900/40" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">Featured Track</p>
                      <p className="text-sm text-white">{selectedTrack.name}</p>
                      <p className="text-xs text-emerald-50/80">{selectedTrack.artists}</p>
                      {selectedTrack.album && (
                        <p className="text-[11px] text-emerald-50/70">{selectedTrack.album}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                      disabled={!selectedTrack.preview_url && !selectedTrack.url}
                      onClick={togglePlay}
                    >
                      {isPlaying ? "Pause Preview" : selectedTrack.preview_url ? "Play Preview" : "Open Spotify"}
                    </Button>
                  </div>
                  {playError && (
                    <p className="text-xs text-amber-100/90">
                      {playError}
                    </p>
                  )}
                </div>
              )}
              {clean ? (
                <p className="whitespace-pre-line text-base leading-relaxed text-slate-100 sm:text-[15px]">
                  {clean}
                </p>
              ) : (
                <div className="py-10 text-center">
                  <Sparkles className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                  <p className="text-slate-400">No summary yet — create a life update!</p>
                </div>
              )}

              {photos.length > 0 && <MediaGrid photos={photos} />}

              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-100"
                      title={t}
                    >
                      <span className="opacity-70">#</span>
                      <span className="font-medium">{t.replace(/^#/, "")}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 pr-2 text-xs text-slate-400 sm:gap-3 sm:justify-between">
                {[
                  { icon: MessageCircle, label: "Comment" },
                  { icon: Repeat2, label: "Repost" },
                  { icon: Heart, label: "Like" },
                  { icon: Share2, label: "Share" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="flex min-w-[48%] items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/10 hover:text-white sm:min-w-0"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            onClick={() => navigate("/life-updates")}
            className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 text-white shadow-glow transition-all hover:shadow-blue-500/40 sm:flex-1 sm:min-w-[180px]"
          >
            Create New Update
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="w-full rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 sm:w-auto sm:min-w-[120px]"
          >
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
