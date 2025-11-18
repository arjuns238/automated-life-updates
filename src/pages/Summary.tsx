import { useMemo } from "react";
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
          className="w-full h-auto max-h-[520px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
              className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
            className="col-span-1 w-full h-[328px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
                className="w-full h-[163px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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

  const { clean, tags } = splitHashtags(aiSummary);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_25%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#ffffff0f_1px,transparent_0)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
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
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
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
                    AI Companion
                  </CardTitle>
                  <span className="text-xs text-slate-300">· just now</span>
                </div>
                <div className="text-xs text-slate-400">@goodvibes</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="pl-14">
              {clean ? (
                <p className="text-[15px] leading-relaxed whitespace-pre-line text-slate-100">
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

              <div className="mt-4 flex items-center justify-between pr-2 text-xs text-slate-400">
                <button className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/10 hover:text-white">
                  <MessageCircle className="h-4 w-4" />
                  <span>Comment</span>
                </button>
                <button className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/10 hover:text-white">
                  <Repeat2 className="h-4 w-4" />
                  <span>Repost</span>
                </button>
                <button className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/10 hover:text-white">
                  <Heart className="h-4 w-4" />
                  <span>Like</span>
                </button>
                <button className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/10 hover:text-white">
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => navigate("/life-updates")}
            className="flex-1 min-w-[180px] bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 text-white shadow-glow transition-all hover:shadow-blue-500/40"
          >
            Create New Update
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="min-w-[120px] rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
