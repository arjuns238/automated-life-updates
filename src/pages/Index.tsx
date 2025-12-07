import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ComponentType,
} from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Play,
  Sparkle,
  Sparkles,
  Wand2,
} from "lucide-react";
import Footer from "@/components/Footer";

type StoryCard = {
  title: string;
  detail: string;
  meta: string;
  tone: string;
  icon: ComponentType<{ className?: string }>;
};

const storyCards: StoryCard[] = [
  {
    title: "Remember the good stuff",
    detail: "Little updates become one clear memory: workouts, songs, photos, and thoughts in a single thread.",
    meta: "Collecting Spotify · Strava · Calendar · Photos",
    tone: "from-amber-400/25 via-orange-400/15 to-rose-400/10",
    icon: Sparkles,
  },
  {
    title: "Two wraps, one truth",
    detail: "A private, honest recap just for you. A public-safe highlight reel you can share without oversharing.",
    meta: "Private + shareable, separated by design",
    tone: "from-cyan-500/20 via-blue-500/15 to-indigo-500/10",
    icon: CalendarRange,
  },
  {
    title: "Emotion forward, not a feed",
    detail: "dAIly is a gentle companion. No guilt, no streaks, just a way to explain how you’ve really been.",
    meta: "Built to calm the chaos",
    tone: "from-emerald-500/25 via-teal-500/15 to-sky-500/10",
    icon: ShieldGlyph,
  },
];

const logos = ["Spotify", "Strava", "Google Calendar", "Apple Photos", "Maps", "Notion", "Oura"];

const testimonials = [
  {
    name: "Sasha, product design",
    quote: "It finally lets me explain how I’ve been without dumping every detail. The private wrap feels honest.",
  },
  {
    name: "Jordan, runner",
    quote: "I drop in runs and songs, and dAIly hands back a month that actually sounds like me.",
  },
  {
    name: "Lena, traveler",
    quote: "I forget what happened by week two. The recap brings the small moments back, not just the trips.",
  },
  {
    name: "Chris, PM",
    quote: "It’s the only recap that feels gentle and private-first. The public version stays high-level on purpose.",
  },
];

function ShieldGlyph({ className }: { className?: string }) {
  return (
    <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-cyan-100 ${className || ""}`}>
      <Wand2 className="h-3.5 w-3.5" />
    </div>
  );
}

function AnimatedText({ text }: { text: string }) {
  return (
    <span className="text-clip">
      {text.split(" ").map((word, wordIndex) => (
        <span key={`word-${wordIndex}`} className="word">
          {word.split("").map((char, charIndex) => {
            const delayIndex = wordIndex * word.length + charIndex;
            return (
              <span key={`char-${wordIndex}-${charIndex}`} className="char">
                <span style={{ animationDelay: `${delayIndex * 0.035}s` }}>{char}</span>
              </span>
            );
          })}
          {wordIndex < text.split(" ").length - 1 && <span className="space">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

const Index = () => {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-animate]"));
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        });
      },
      { threshold: 0.3 }
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCard(prev => (prev + 1) % storyCards.length);
    }, 5600);
    return () => clearInterval(timer);
  }, []);

  const handleFlashlightMove = useCallback((event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty("--mx", `${x}%`);
    event.currentTarget.style.setProperty("--my", `${y}%`);
  }, []);

  const resetFlashlight = useCallback((event: MouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--mx", "50%");
    event.currentTarget.style.setProperty("--my", "50%");
  }, []);

  const active = useMemo(() => storyCards[activeCard], [activeCard]);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-black text-slate-50">
      <style dangerouslySetInnerHTML={{ __html: landingStyles }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.18),transparent_32%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(79,70,229,0.16),transparent_28%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#0b1224_1px,transparent_0)] [background-size:32px_32px]" />
      <div className="clip-grid">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="clip-column" style={{ ["--i" as string]: idx } as CSSProperties} />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12">
        <header className="grid items-center gap-10 lg:grid-cols-[1.25fr,1fr]">
          <div className="space-y-6" data-animate>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100 shadow-inner shadow-blue-500/10">
              <Sparkle className="h-4 w-4" />
              dAIly · Monthly life recap
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                <AnimatedText text="A gentle companion that remembers your month, then writes the story for you." />
              </h1>
              <p className="max-w-2xl text-lg text-slate-200/85">
                Drop in small updates. dAIly keeps track, adds context you forgot, and at month’s end
                gives you two wraps: a personal narrative and a public highlight reel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                variant="secondary"
                className="beam-button h-12 border border-white/20 bg-white/10 px-6 text-slate-50 hover:bg-white/20"
                onClick={() => navigate("/sign-in")}
              >
                Sign in
              </Button>
              <Button
                size="lg"
                className="beam-button h-12 border border-white/20 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 px-7 text-white shadow-glow transition-all hover:shadow-blue-500/40"
                onClick={() => navigate("/sign-up")}
              >
                Don't have an account? Sign up
                <ArrowRight className="h-4 w-4" />
              </Button>
              {/* <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
                <Activity className="h-4 w-4 text-green-300" />
                Live: syncing 7 services
              </span> */}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Moments saved", value: "24 this month" },
                { label: "Private insights", value: "Pattern: calmer weeks after long runs" },
                { label: "Shareable cards", value: "Public wrap ready" },
              ].map((item, idx) => (
                <div
                  key={item.label}
                  className="flashlight-card rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-blue-500/5"
                  data-animate
                  style={{ ["--delay" as string]: `${idx * 0.06}s` } as CSSProperties}
                  onMouseMove={handleFlashlightMove}
                  onMouseLeave={resetFlashlight}
                >
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-300/70">{item.label}</p>
                  <p className="text-lg font-semibold text-slate-50">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative" data-animate>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-500/25 to-indigo-600/10 blur-3xl" />
            <div
              className="relative rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl flashlight-card"
              onMouseMove={handleFlashlightMove}
              onMouseLeave={resetFlashlight}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-200/80">Wrap preview</p>
                  <p className="text-2xl font-semibold text-white">Private + public safe</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-50">
                  <Sparkles className="h-4 w-4" />
                  Auto-loop
                </div>
              </div>

              <div className="relative mt-6">
                <div className="rotating-card overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-5 shadow-2xl" style={{ animationDelay: "0.05s" }}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${active.tone} opacity-80`} />
                  <div className="relative flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-white/10 p-2 text-blue-100 shadow-inner shadow-blue-500/10">
                        <active.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-200/80">{active.meta}</p>
                        <p className="text-lg font-semibold text-white">{active.title}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-50/80">{active.detail}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">Private-first</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">Share-safe ready</span>
                    </div>
                  </div>
                </div>
                <div className="pointer-events-auto absolute inset-x-0 -bottom-4 flex items-center justify-between">
                  <button
                    className="beam-button flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-slate-50 backdrop-blur"
                    onClick={() => setActiveCard(prev => (prev - 1 + storyCards.length) % storyCards.length)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    className="beam-button flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-slate-50 backdrop-blur"
                    onClick={() => setActiveCard(prev => (prev + 1) % storyCards.length)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-4" data-animate>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <p className="text-xs uppercase tracking-[0.12em] text-slate-200/70">
              Integrations that build your wrap
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>
          <div className="alpha-mask overflow-hidden rounded-full border border-white/5 bg-white/[0.03] px-4 py-3 shadow-inner shadow-blue-500/10">
            <div className="marquee-track">
              {[...logos, ...logos].map((logo, idx) => (
                <div
                  key={`${logo}-${idx}`}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 shadow-sm shadow-black/30"
                >
                  <div className="h-2 w-2 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" />
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4" data-animate>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CalendarRange className="h-4 w-4 text-blue-200" />
              Built to feel calm: no feed, no pressure, just your month in focus.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Small updates, big clarity",
                  body: "Drop in quick thoughts, a photo, a workout, or a song. Integrations fill in the rest so nothing gets lost.",
                },
                {
                  title: "Private emotional wrap",
                  body: "A month-end narrative that talks like you do: honest, contextual, and only yours.",
                },
                {
                  title: "Public-safe highlight reel",
                  body: "A shareable version with the vibe of your month, minus the sensitive details.",
                },
                {
                  title: "No guilt, no feed",
                  body: "Not another social scroll or streak to protect, just a calm space to remember and reflect.",
                },
              ].map((item, idx) => (
                <div
                  key={item.title}
                  className="flashlight-card group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl"
                  data-animate
                  style={{ ["--delay" as string]: `${idx * 0.08}s` } as CSSProperties}
                  onMouseMove={handleFlashlightMove}
                  onMouseLeave={resetFlashlight}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-cyan-500/15 opacity-30 transition-opacity duration-300 group-hover:opacity-70" />
                  <div className="relative space-y-2">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-200/80">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flashlight-card relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl"
            data-animate
            onMouseMove={handleFlashlightMove}
            onMouseLeave={resetFlashlight}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_35%)]" />
            <div className="relative space-y-3">
              <p className="text-sm text-slate-200/80">Story delivery</p>
              <h3 className="text-2xl font-semibold text-white">
                <AnimatedText text="Storytelling that feels calm and intentional." />
              </h3>
              <p className="text-sm text-slate-300/80">
                The wrap reads like a note from someone who knows you well, animated softly, focused
                on clarity, not hype.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">Clip-path reveal</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">No opacity zero</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">Mobile ready</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5" data-animate>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200/80">People using dAIly</p>
              <h3 className="text-2xl font-semibold text-white">Why a monthly wrap that feels human matters</h3>
            </div>
            <Button
              variant="ghost"
              className="beam-button rounded-full border border-white/20 bg-white/10 text-sm text-slate-50"
              onClick={() => navigate("/sign-up")}
            >
              Join dAIly
            </Button>
          </div>
          <div className="alpha-mask overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-blue-900/30">
            <div className="marquee-track slower">
              {[...testimonials, ...testimonials].map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="flashlight-card mr-4 min-w-[260px] max-w-[300px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-black/90 p-4 text-sm leading-relaxed text-slate-100 shadow-lg"
                  onMouseMove={handleFlashlightMove}
                  onMouseLeave={resetFlashlight}
                >
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="mt-2 text-slate-200/80">{item.quote}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8 shadow-2xl" data-animate>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.12),transparent_30%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.3fr,1fr] items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
                <Play className="h-4 w-4" />
                Month-end ritual
              </div>
              <h3 className="text-3xl font-semibold text-white">
                Ready to see your month with clarity?
              </h3>
              <p className="text-slate-200/80 text-lg">
                dAIly quietly keeps your moments, then gives you two wraps: one deeply honest for
                you, one public-safe and aesthetic for everyone else.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  className="beam-button h-12 border border-white/25 bg-white/10 px-6 text-slate-50"
                  size="lg"
                  onClick={() => navigate("/sign-in")}
                >
                  Sign in
                </Button>
                <Button
                  className="beam-button h-12 border border-white/25 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 px-7 text-white"
                  size="lg"
                  onClick={() => navigate("/sign-up")}
                >
                  Don't have an account? Sign up
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div
              className="flashlight-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md"
              onMouseMove={handleFlashlightMove}
              onMouseLeave={resetFlashlight}
            >
              <div className="flex items-center justify-between text-sm text-slate-200/90">
                <span>Monthly recap preview</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs">Auto</span>
              </div>
              <div className="mt-4 space-y-3">
                {["Private thoughts", "Songs that stuck", "Workouts logged", "Events & photos"].map((item, idx) => (
                  <div key={item} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <span className="text-slate-100">{item}</span>
                    <span className="text-slate-300/80">{idx % 2 === 0 ? "Saved privately" : "Analyzing"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Index;

const landingStyles = `
  .clip-grid {
    position: absolute;
    inset: -4% -6%;
    display: flex;
    gap: 1.5rem;
    pointer-events: none;
  }
  .clip-column {
    position: relative;
    flex: 1;
    background: linear-gradient(180deg, rgba(46,108,255,0.08), rgba(17,24,39,0.8));
    mix-blend-mode: screen;
    clip-path: inset(0 0 100% 0);
    animation: columnSweep 8s ease-in-out infinite both;
    filter: blur(1px);
  }
  .clip-column:nth-child(odd) {
    background: linear-gradient(180deg, rgba(14,165,233,0.07), rgba(15,23,42,0.7));
  }
  .clip-column:nth-child(even) {
    background: linear-gradient(180deg, rgba(79,70,229,0.08), rgba(12,16,32,0.65));
  }
  .clip-column {
    animation-delay: calc(var(--i) * 0.35s);
  }
  @keyframes columnSweep {
    0% { clip-path: inset(0 0 100% 0); }
    30% { clip-path: inset(0 0 0 0); }
    60% { clip-path: inset(0 0 18% 0); }
    100% { clip-path: inset(0 0 70% 0); }
  }
  [data-animate] {
    opacity: 0.35;
    transform: translateY(20px) scale(0.98);
    filter: blur(12px);
  }
  [data-animate].in-view {
    animation: floatIn 0.9s cubic-bezier(0.19, 1, 0.22, 1) var(--delay, 0s) both;
  }
  @keyframes floatIn {
    from {
      opacity: 0.32;
      transform: translateY(28px) scale(0.97);
      filter: blur(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }
  .beam-button {
    position: relative;
    overflow: hidden;
    border-radius: 9999px;
  }
  .beam-button::after {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: 9999px;
    padding: 1px;
    background: conic-gradient(from 0deg, rgba(59,130,246,0.35), rgba(236,72,153,0.25), rgba(59,130,246,0.35));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: borderBeam 3s linear infinite both;
    animation-play-state: paused;
    opacity: 0.7;
    pointer-events: none;
  }
  .beam-button:hover::after { animation-play-state: running; }
  @keyframes borderBeam { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .text-clip {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.02em;
  }
  .text-clip .word { display: inline-flex; gap: 0.02em; white-space: nowrap; }
  .text-clip .space { display: inline-block; width: 0.35em; }
  .text-clip .char { position: relative; display: inline-block; overflow: hidden; }
  .text-clip .char > span {
    display: block;
    transform: translateY(120%);
    opacity: 0.45;
    clip-path: inset(0 0 95% 0);
    animation: textSlide 0.9s cubic-bezier(0.19, 1, 0.22, 1) both;
    animation-delay: var(--delay, 0s);
  }
  @keyframes textSlide {
    from { transform: translateY(120%); opacity: 0.45; clip-path: inset(0 0 95% 0); }
    to { transform: translateY(0%); opacity: 1; clip-path: inset(0 0 0 0); }
  }
  .alpha-mask {
    -webkit-mask-image: linear-gradient(90deg, transparent, rgba(0,0,0,0.9) 12%, rgba(0,0,0,0.9) 88%, transparent);
    mask-image: linear-gradient(90deg, transparent, rgba(0,0,0,0.9) 12%, rgba(0,0,0,0.9) 88%, transparent);
  }
  .marquee-track {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    min-width: max-content;
    animation: marquee 32s linear infinite both;
  }
  .marquee-track.slower { animation-duration: 44s; }
  @keyframes marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  .flashlight-card {
    position: relative;
    --mx: 50%;
    --my: 50%;
    overflow: hidden;
  }
  .flashlight-card::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    background: radial-gradient(circle at var(--mx) var(--my), rgba(94,234,212,0.22), transparent 35%);
    pointer-events: none;
    transition: background 0.3s ease;
  }
  .flashlight-card::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 0 0 1px rgba(59,130,246,0.12);
    pointer-events: none;
    mask-image: radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,0.9), rgba(255,255,255,0.2) 50%, transparent 80%);
    opacity: 0.7;
    transition: opacity 0.3s ease;
  }
  .rotating-card {
    position: relative;
    animation: cardIntro 0.95s cubic-bezier(0.19, 1, 0.22, 1) both;
    backdrop-filter: blur(8px);
  }
  @keyframes cardIntro {
    from {
      opacity: 0.4;
      transform: perspective(1200px) rotateY(-10deg) translateY(16px) scale(0.96);
      filter: blur(6px);
    }
    to {
      opacity: 1;
      transform: perspective(1200px) rotateY(0deg) translateY(0) scale(1);
      filter: blur(0);
    }
  }
`;
