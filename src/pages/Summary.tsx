import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Share2, Heart, MessageCircle, Repeat2 } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      {/* Soft gradient header bar */}
      <div className="sticky top-0 z-10 border-b">
        <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-2xl">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h1 className="text-sm font-semibold tracking-wide">Your Summary</h1>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Post card */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="border border-border/60 bg-card/70 backdrop-blur shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              {/* glowy avatar */}
              <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-pink-500 to-amber-400 animate-pulse opacity-30" />
                <div className="relative w-full h-full rounded-full bg-gradient-hero flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold leading-none">AI Companion</CardTitle>
                  <span className="text-xs text-muted-foreground">· just now</span>
                </div>
                <div className="text-xs text-muted-foreground">@goodvibes</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="pl-14">
              {/* body */}
              {clean ? (
                <p className="text-[15px] leading-relaxed whitespace-pre-line">
                  {clean}
                </p>
              ) : (
                <div className="text-center py-10">
                  <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                  <p className="text-muted-foreground">No summary yet — create a life update!</p>
                </div>
              )}

              {/* media (inside post) */}
              {photos.length > 0 && <MediaGrid photos={photos} />}

              {/* hashtag chips */}
              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.slice(0, 6).map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-background/60 hover:bg-background transition"
                      title={t}
                    >
                      <span className="opacity-70">#</span>
                      <span className="font-medium">{t.replace(/^#/, "")}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* action bar */}
              <div className="mt-4 flex items-center justify-between pr-2 text-xs text-muted-foreground">
                <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>Comment</span>
                </button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Repeat2 className="w-4 h-4" />
                  <span>Repost</span>
                </button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Heart className="w-4 h-4" />
                  <span>Like</span>
                </button>
                <button className="flex items-center gap-2 hover:text-foreground transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* footer actions */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => navigate("/life-updates")}
            className="flex-1 bg-gradient-hero text-primary-foreground shadow-glow hover:shadow-warm transition-all"
          >
            Create New Update
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="px-6">
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
