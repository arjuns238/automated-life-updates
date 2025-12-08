import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  ListChecks,
  Activity,
  Music2,
  CalendarDays,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";

type TripCard = {
  id: string;
  country: string;
  title: string;
  image: string;
  rating: number;
  reviews: number;
};

const tripCards: TripCard[] = [
  {
    id: "rio",
    country: "Brazil",
    title: "Rio de Janeiro",
    image:
      "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=600&auto=format&fit=crop",
    rating: 5.0,
    reviews: 143,
  },
  {
    id: "kyoto",
    country: "Japan",
    title: "Kyoto",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop",
    rating: 4.9,
    reviews: 89,
  },
  {
    id: "amalfi",
    country: "Italy",
    title: "Amalfi Coast",
    image:
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600&auto=format&fit=crop",
    rating: 4.8,
    reviews: 210,
  },
];

const categories = ["Asia", "Europe", "South America", "Africa"];
const defaultName = "";

export default function Home() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(defaultName);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    updates: 0,
    workouts: 0,
    minutes: 0,
    events: 0,
  });
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);

  const totalCards = tripCards.length;

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      const displayName =
        (user?.user_metadata as Record<string, string | undefined> | undefined)?.full_name ||
        (user?.user_metadata as Record<string, string | undefined> | undefined)?.name ||
        user?.email?.split("@")[0] ||
        defaultName;
      setUserName(displayName);

      if (user?.id) {
        fetchLifeUpdateCount(user.id, () => isMounted);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.innerWidth >= 1024;
    if (!isDesktop) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = revealRefs.current.findIndex(el => el === entry.target);
            if (idx >= 0) {
              setRevealed(prev => {
                const next = [...prev];
                next[idx] = true;
                return next;
              });
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.2 }
    );

    revealRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const rotateCards = (direction: "next" | "prev") => {
    setCurrentIndex(prev =>
      direction === "next" ? (prev + 1) % totalCards : (prev - 1 + totalCards) % totalCards
    );
  };

  const handleTouchStart = (clientX: number) => {
    setTouchStartX(clientX);
  };

  const handleTouchEnd = (clientX: number) => {
    if (touchStartX === null) return;
    const deltaX = clientX - touchStartX;
    const threshold = 40;
    if (deltaX > threshold) {
      rotateCards("prev");
    } else if (deltaX < -threshold) {
      rotateCards("next");
    }
    setTouchStartX(null);
  };

  const getCardStyles = (index: number): CSSProperties => {
    const position = (index - currentIndex + totalCards) % totalCards;

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
        transform: "translateX(25px) scale(0.92) rotate(4deg)",
      };
    }

    if (position === totalCards - 1) {
      return {
        zIndex: 10,
        opacity: 0.7,
        transform: "translateX(-25px) scale(0.92) rotate(-4deg)",
      };
    }

    return {
      zIndex: 0,
      opacity: 0,
      transform: "scale(0.8)",
    };
  };

  const fetchLifeUpdateCount = async (uid: string, isMounted: () => boolean) => {
    setLoadingStats(true);
    try {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);

      const { count, error } = await supabase
        .from("life_updates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

      if (error) return;
      if (!isMounted()) return;
      setStats(prev => ({ ...prev, updates: count ?? 0 }));
    } finally {
      if (isMounted()) {
        setLoadingStats(false);
      }
    }
  };

  const integrations = [
    {
      title: "Life updates",
      metric: `${stats.updates || 0} updates`,
      description: "Quick notes and photos you’ve logged this month.",
      icon: ListChecks,
      action: () => navigate("/life-updates"),
      actionLabel: "Add update",
    },
    {
      title: "Strava",
      metric: `${stats.workouts || 0} workouts`,
      description: "Runs and rides synced to your wrap.",
      icon: Activity,
      action: () => navigate("/settings"),
      actionLabel: "Manage Strava",
    },
    {
      title: "Spotify",
      metric: `${stats.minutes || 0} min listened`,
      description: "Top tracks and genres from your month.",
      icon: Music2,
      action: () => navigate("/settings"),
      actionLabel: "Manage Spotify",
    },
    {
      title: "Calendar",
      metric: `${stats.events || 0} events`,
      description: "Highlights pulled from your calendar.",
      icon: CalendarDays,
      action: () => navigate("/settings"),
      actionLabel: "Manage Calendar",
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-gray-100 flex flex-col items-center px-4 py-10 gap-6">
      <div className="w-full max-w-6xl flex flex-col items-center gap-8 pb-36">
        <div
          ref={el => (revealRefs.current[0] = el)}
          className={`w-full max-w-4xl space-y-8 lg:transition lg:duration-700 lg:ease-out lg:opacity-0 lg:translate-y-6 ${
            revealed[0] ? "lg:opacity-100 lg:translate-y-0" : ""
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white leading-tight">
                Hello, {userName}
              </h1>
              <p className="text-lg text-gray-400 mt-1 font-medium">Welcome to dAIly</p>
            </div>
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"
                alt="Profile"
                className="w-full h-full object-cover opacity-90 transition-opacity hover:opacity-100"
              />
            </div>
          </div>

          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold tracking-tight text-white">Select your next trip</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {categories.map(category => (
                <button
                  key={category}
                  className={`px-6 py-3 rounded-full font-medium text-base whitespace-nowrap transition-colors ${
                    category === "South America"
                      ? "bg-white text-black font-semibold shadow-md shadow-white/10"
                      : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div
            className="relative w-full h-[460px] flex justify-center items-center"
            style={{ perspective: "1000px" }}
            onTouchStart={e => handleTouchStart(e.touches[0].clientX)}
            onTouchEnd={e => handleTouchEnd(e.changedTouches[0].clientX)}
          >
            <button
              onClick={() => rotateCards("prev")}
              className="absolute left-4 z-50 w-10 h-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg text-white hover:bg-black/80 transition-colors"
              aria-label="Previous trip"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => rotateCards("next")}
              className="absolute right-4 z-50 w-10 h-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg text-white hover:bg-black/80 transition-colors"
              aria-label="Next trip"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="relative w-full h-full flex justify-center items-center">
              {tripCards.map((card, index) => (
                <div
                  key={card.id}
                  className="trip-card absolute w-[300px] h-[420px] rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50 transition-all duration-[600ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer group border border-white/5"
                  style={getCardStyles(index)}
                  onClick={() => navigate("/wrap")}
                >
                  <img src={card.image} className="w-full h-full object-cover" alt={card.title} />
                  <div className="absolute top-5 right-5 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                    <div className="flex items-center gap-2 mb-1 text-gray-300 text-base font-medium">
                      <span>{card.country}</span>
                    </div>
                    <h3 className="text-3xl font-semibold tracking-tight mb-2">{card.title}</h3>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-semibold text-sm">{card.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-sm text-gray-300 font-medium">{card.reviews} reviews</span>
                    </div>
                    <div className="w-full h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-between px-5 border border-white/10 group-hover:bg-white/20 transition-colors">
                      <span className="font-medium text-lg text-white">See more</span>
                      <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          ref={el => (revealRefs.current[1] = el)}
          className={`w-full max-w-4xl lg:transition lg:duration-700 lg:ease-out lg:opacity-0 lg:translate-y-6 ${
            revealed[1] ? "lg:opacity-100 lg:translate-y-0" : ""
          }`}
        >
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4 text-white shadow-lg shadow-black/30 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-300">Monthly recap</p>
                <p className="text-xl font-semibold">View your wrap</p>
              </div>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full border border-white/10 bg-white text-black hover:bg-gray-200"
              onClick={() => navigate("/wrap")}
            >
              Open
            </Button>
            </div>
            <p className="text-sm text-gray-400">
              See your latest highlights, AI summary, and hero backdrop in one place.
            </p>
          </div>
        </div>

        <div
          ref={el => (revealRefs.current[2] = el)}
          className={`w-full max-w-4xl space-y-6 mt-2 lg:transition lg:duration-700 lg:ease-out lg:opacity-0 lg:translate-y-6 ${
            revealed[2] ? "lg:opacity-100 lg:translate-y-0" : ""
          }`}
        >
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Your month so far</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[
                { label: "Updates", value: stats.updates },
                { label: "Workouts", value: stats.workouts },
                { label: "Min listened", value: stats.minutes },
                { label: "Events", value: stats.events },
              ].map(item => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-white flex flex-col items-center"
                >
                  <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400 text-center">
                    {item.label}
                  </p>
                  <p className="text-2xl font-semibold mt-2">
                    {loadingStats ? <Loader2 className="h-5 w-5 animate-spin text-gray-300" /> : item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            ref={el => (revealRefs.current[3] = el)}
            className={`space-y-4 lg:transition lg:duration-700 lg:ease-out lg:opacity-0 lg:translate-y-6 ${
              revealed[3] ? "lg:opacity-100 lg:translate-y-0" : ""
            }`}
          >
            <div className="flex items-center gap-2 text-white">
              <Activity className="h-4 w-4 text-cyan-300" />
              <h3 className="text-lg font-semibold">Your integrations</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map(card => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/5 bg-white/[0.04] px-5 py-4 text-white shadow-lg shadow-black/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-gray-300">{card.title}</p>
                      <p className="text-xl font-semibold">{card.metric}</p>
                    </div>
                    <card.icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className="text-sm text-gray-400 mb-4">{card.description}</p>
                  <button
                    onClick={card.action}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition border border-white/10"
                  >
                    {card.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
