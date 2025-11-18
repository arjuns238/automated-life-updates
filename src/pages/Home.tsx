import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Activity,
  ArrowRight,
  MessageCircle,
  Sparkles,
  Sparkle,
  User,
  Wand2,
} from "lucide-react";

const quickActions = [
  {
    title: "Generate Summary",
    description: "Turn your latest updates into a digest in seconds.",
    actionLabel: "Open summary",
    onClick: (navigate: (path: string) => void) => navigate("/summary"),
    icon: Sparkles,
    accent: "from-blue-500/25 via-indigo-500/20 to-blue-600/15",
  },
  {
    title: "Jump into Chats",
    description: "Pick up conversations with all the right context.",
    actionLabel: "Go to chats",
    onClick: (navigate: (path: string) => void) => navigate("/chats"),
    icon: MessageCircle,
    accent: "from-emerald-500/20 via-teal-500/20 to-cyan-500/10",
  },
  {
    title: "Tune Preferences",
    description: "Adjust reminders, tone, and recap cadence to fit you.",
    actionLabel: "Open profile",
    onClick: (navigate: (path: string) => void) => navigate("/profile"),
    icon: User,
    accent: "from-amber-500/25 via-orange-500/20 to-rose-500/10",
  },
];

const pulseGradients = [
  "bg-blue-500/30 top-[-4rem] left-[-2rem]",
  "bg-indigo-500/25 bottom-[-6rem] right-10",
  "bg-cyan-500/20 top-1/3 right-[-3rem]",
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_25%)]" />
      {pulseGradients.map((className, idx) => (
        <div
          key={idx}
          className={`absolute h-72 w-72 rounded-full blur-3xl animate-pulse duration-[4500ms] ${className}`}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#ffffff0f_1px,transparent_0)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="grid items-center gap-8 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-blue-100 shadow-inner shadow-blue-500/10">
              <Sparkle className="h-4 w-4" />
              Your AI friend is ready
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                Welcome back! Let&rsquo;s turn your day into a story worth
                sharing.
              </h1>
              <p className="max-w-2xl text-lg text-slate-200/80">
                Capture your wins, questions, and half-formed thoughts. We&rsquo;ll keep them organized,
                summarized, and ready to share with the people who matter.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 text-white shadow-glow transition-all hover:shadow-blue-500/40"
                onClick={() => navigate("/summary")}
              >
                Generate a summary
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="border border-white/20 bg-white/10 text-slate-50 hover:bg-white/20"
                onClick={() => navigate("/chats")}
              >
                Open chats
              </Button>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
                <Activity className="h-4 w-4 text-green-300" />
                Live status: Collecting updates
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Today", value: "3 insights drafted" },
                { label: "Streak", value: "12 days in a row" },
                { label: "Recaps", value: "Last sent 3h ago" },
              ].map(item => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-blue-500/5"
                >
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-300/70">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold text-slate-50">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-500/20 to-indigo-600/10 blur-2xl" />
            <div className="relative rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-200/80">Dynamic digest</p>
                  <p className="text-2xl font-semibold text-white">In progress</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-50">
                  <Sparkles className="h-4 w-4" />
                  Auto-mode
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  { title: "Context-aware insights", progress: 76 },
                  { title: "Tone & clarity cleanup", progress: 62 },
                  { title: "Share-ready summary", progress: 44 },
                ].map(item => (
                  <div key={item.title} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm text-slate-200/90">
                      <span>{item.title}</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-500/20 p-2 text-blue-100">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">
                      Fresh suggestions waiting
                    </p>
                    <p className="text-sm text-slate-200/80">
                      We’ve drafted a note about your morning run and a friendly check-in for Sam.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                        Mood boost
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                        Health update
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                        Share-ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map(item => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-60`} />
              <div className="relative flex h-full flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white/10 p-2 text-blue-100 shadow-inner shadow-blue-500/10">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                </div>
                <p className="text-sm text-slate-200/80 leading-relaxed">
                  {item.description}
                </p>
                <Button
                  variant="ghost"
                  className="mt-auto w-fit text-blue-100 hover:bg-white/10 hover:text-white"
                  onClick={() => item.onClick(navigate)}
                >
                  {item.actionLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
