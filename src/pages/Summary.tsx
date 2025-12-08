import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Share2, Heart, MessageCircle, Repeat2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
      <div className="mt-4 overflow-hidden rounded-2xl group">
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
      <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl">
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
      <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl">
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
    <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl">
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
  update_id?: string;
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
  const { toast } = useToast();

  // text
  const initialSummary = state.aiSummary ?? localStorage.getItem("aiSummary") ?? "";
  const updateId =
    state.update_id ?? localStorage.getItem("last_update_id") ?? "";

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

  const handleSave = async () => {
    if (!updateId) {
      toast({
        title: "Cannot save",
        description: "Missing update id to save this summary.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("life_updates")
        .update({ ai_summary: editable })
        .eq("id", updateId);
      if (error) throw error;
      setSummaryText(editable);
      localStorage.setItem("aiSummary", editable);
      toast({
        title: "Summary saved",
        description: "Your recap has been updated.",
      });
      setEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save summary.";
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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

  const [fetchedPhotos, setFetchedPhotos] = useState<string[]>([]);
  const [summaryText, setSummaryText] = useState(initialSummary);
  const [editable, setEditable] = useState(initialSummary);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { clean, tags } = splitHashtags(summaryText);
  const finalPhotos = fetchedPhotos.length ? fetchedPhotos : photos;
  const heroImage = finalPhotos[0];
  const galleryPhotos = finalPhotos.slice(1);

  useEffect(() => {
    setSummaryText(initialSummary);
    setEditable(initialSummary);
  }, [initialSummary]);

  useEffect(() => {
    const loadFromDb = async () => {
      if ((summaryText && summaryText.trim()) || !updateId) return;
      const { data, error } = await supabase
        .from("life_updates")
        .select("ai_summary, photos")
        .eq("id", updateId)
        .single();
      if (error || !data) return;
      if (data.ai_summary) {
        setSummaryText(data.ai_summary);
        setEditable(data.ai_summary);
      }
      if (Array.isArray(data.photos) && data.photos.length) {
        setFetchedPhotos(data.photos.filter(Boolean));
      }
    };
    void loadFromDb();
  }, [summaryText, updateId]);

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-100 flex flex-col items-center px-4 py-10 md:py-14">
      <div className="w-full max-w-5xl space-y-8">
        <div className="space-y-1 px-1">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Your AI recap</h1>
          <p className="text-base text-gray-400">Polished to match your TripGlide style.</p>
        </div>

        <div
          className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/50"
          style={
            heroImage
              ? { backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {heroImage && <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/75 to-black/70" />}
          <div className="relative px-5 py-6 sm:px-8 sm:py-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-indigo-400 to-purple-500 opacity-40 blur-md" />
                <div className="relative flex h-full w-full items-center justify-center rounded-full bg-black/60 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold leading-none text-white">This month’s summary</p>
                  <span className="text-xs text-gray-300">· just now</span>
                </div>
                <div className="text-sm text-gray-300/90">crafted privately for you</div>
              </div>
            </div>

            <div className="space-y-4 pl-1 sm:pl-12">
              {selectedTrack && (
                <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-inner shadow-black/30 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {selectedTrack.image ? (
                      <img
                        src={selectedTrack.image}
                        alt={selectedTrack.name}
                        className="h-12 w-12 rounded-xl object-cover shadow-lg shadow-black/40"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-white/10" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">Featured track</p>
                      <p className="text-base text-white">{selectedTrack.name}</p>
                      <p className="text-sm text-gray-300">{selectedTrack.artists}</p>
                      {selectedTrack.album && <p className="text-xs text-gray-400">{selectedTrack.album}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
                      disabled={!selectedTrack.preview_url && !selectedTrack.url}
                      onClick={togglePlay}
                    >
                      {isPlaying ? "Pause preview" : selectedTrack.preview_url ? "Play preview" : "Open Spotify"}
                    </Button>
                  </div>
                  {playError && <p className="text-xs text-amber-100/90">{playError}</p>}
                </div>
              )}

              {clean ? (
                <div className="space-y-3">
                  {editing ? (
                    <>
                      <textarea
                        value={editable}
                        onChange={(e) => setEditable(e.target.value)}
                        rows={5}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-base text-gray-100 shadow-inner shadow-black/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-white text-black hover:bg-white/90 rounded-full"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>Save</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditable(summaryText);
                            setEditing(false);
                          }}
                          className="text-gray-200 hover:bg-white/10 rounded-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p
                        className="whitespace-pre-line break-words text-base leading-relaxed text-gray-100 sm:text-[15px]"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {clean}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/15"
                          onClick={() => setEditing(true)}
                          disabled={!updateId}
                          title={updateId ? "Edit summary" : "Cannot edit without update id"}
                        >
                          Edit
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Sparkles className="mx-auto mb-3 h-10 w-10 text-gray-500" />
                  <p className="text-gray-400">No summary yet. Create a life update!</p>
                </div>
              )}

              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white"
                      title={t}
                    >
                      <span className="opacity-70">#</span>
                      <span className="font-medium">{t.replace(/^#/, "")}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 pr-2 text-xs text-gray-400 sm:gap-3 sm:justify-between">
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

              {galleryPhotos.length > 0 && (
                <div className="mt-4 rounded-[1.25rem] bg-black/30 p-3 backdrop-blur-sm">
                  <MediaGrid photos={galleryPhotos} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            onClick={() => navigate("/life-updates")}
            className="w-full rounded-full bg-white text-black shadow-lg shadow-white/10 transition hover:scale-[1.01] sm:flex-1 sm:min-w-[180px]"
          >
            Create New Update
          </Button>
        </div>
      </div>
    </div>
  );
}
