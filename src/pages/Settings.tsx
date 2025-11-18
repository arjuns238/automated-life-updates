import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Link2, CheckCircle2, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  initiateStravaAuth,
  handleStravaCallback,
  getStravaStatus,
  disconnectStrava,
} from "@/integrations/strava/auth";
import {
  initiateSpotifyAuth,
  handleSpotifyCallback,
  getSpotifyStatus,
  disconnectSpotify,
} from "@/integrations/spotify/auth";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;

  const [stravaConnecting, setStravaConnecting] = useState(false);
  const [stravaDisconnecting, setStravaDisconnecting] = useState(false);
  const [checkingStravaStatus, setCheckingStravaStatus] = useState(false);
  const [stravaConnected, setStravaConnected] = useState<boolean>(() => {
    const v = localStorage.getItem("strava_connected");
    return v === "true";
  });

  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const [spotifyDisconnecting, setSpotifyDisconnecting] = useState(false);
  const [checkingSpotifyStatus, setCheckingSpotifyStatus] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(() => {
    const v = localStorage.getItem("spotify_connected");
    return v === "true";
  });

  const stravaHandledRef = useRef(false);
  const spotifyHandledRef = useRef(false);
  const lastOAuthRef = useRef<string | null>(null);

  useEffect(() => {
    lastOAuthRef.current = localStorage.getItem("last_oauth_provider");
  }, []);

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("supabase.auth.getUser error:", error);
        return;
      }
      setUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        setCheckingStravaStatus(true);
        const status = await getStravaStatus(userId);
        if (cancelled) return;

        if (status.connected) {
          localStorage.setItem("strava_connected", "true");
        } else {
          localStorage.removeItem("strava_connected");
        }
        setStravaConnected(status.connected);
      } catch (error) {
        console.error("Failed to fetch Strava status", error);
      } finally {
        if (!cancelled) {
          setCheckingStravaStatus(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        setCheckingSpotifyStatus(true);
        const status = await getSpotifyStatus(userId);
        if (cancelled) return;

        if (status.connected) {
          localStorage.setItem("spotify_connected", "true");
        } else {
          localStorage.removeItem("spotify_connected");
        }
        setSpotifyConnected(status.connected);
      } catch (error) {
        console.error("Failed to fetch Spotify status", error);
      } finally {
        if (!cancelled) {
          setCheckingSpotifyStatus(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Handle callback (?code=...&state=... or ?error=access_denied)
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const lastProvider = lastOAuthRef.current;

    if (error) {
      toast({
        variant: "destructive",
        title: "Authorization cancelled",
        description: "You can try connecting again anytime.",
      });
      navigate("/settings", { replace: true });
      return;
    }

    if (!code) return;
    if (stravaHandledRef.current && spotifyHandledRef.current) return;

    const processCallbacks = async () => {
      let processed = false;
      let errorShown = false;

      // If we know the user initiated Spotify, skip Strava to avoid invalid code errors
      if (!stravaHandledRef.current && lastProvider !== "spotify") {
        stravaHandledRef.current = true;
        setStravaConnecting(true);
        try {
          if (userId && state && userId !== state) {
            throw new Error("Session changed during Strava authorization");
          }

          await handleStravaCallback(code, state ?? userId ?? undefined);
          localStorage.setItem("strava_connected", "true");
          setStravaConnected(true);
          toast({
            title: "Connected to Strava 🎉",
            description: "Your activities can now be synced.",
          });
          processed = true;
        } catch (e) {
          console.warn("Strava callback not processed, trying Spotify next if needed:", e);
          localStorage.removeItem("strava_connected");
          setStravaConnected(false);
          if (e instanceof Error && e.message.includes("Session changed")) {
            toast({
              variant: "destructive",
              title: "Session changed",
              description: "Your session changed during authorization. Please try connecting again.",
            });
            errorShown = true;
          }
        } finally {
          setStravaConnecting(false);
        }
      }

      if (!processed && !spotifyHandledRef.current) {
        spotifyHandledRef.current = true;
        setSpotifyConnecting(true);
        try {
          if (userId && state && userId !== state) {
            throw new Error("Session changed during Spotify authorization");
          }

          await handleSpotifyCallback(code, state ?? userId ?? undefined);
          localStorage.setItem("spotify_connected", "true");
          setSpotifyConnected(true);
          toast({
            title: "Connected to Spotify 🎶",
            description: "We can now pull in your listening history.",
          });
          processed = true;
        } catch (e) {
          console.error("Spotify connect failed:", e);
          localStorage.removeItem("spotify_connected");
          setSpotifyConnected(false);
          toast({
            variant: "destructive",
            title: "Connection failed",
            description: "We couldn’t complete the connection. Please try again.",
          });
          errorShown = true;
        } finally {
          setSpotifyConnecting(false);
        }
      }

      if (!processed && !errorShown) {
        toast({
          variant: "destructive",
          title: "Connection failed",
          description: "We couldn’t complete the connection. Please try again.",
        });
      }

      navigate("/settings", { replace: true });
      localStorage.removeItem("last_oauth_provider");
    };

    void processCallbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userId, navigate, toast]);

  const handleStravaConnect = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast({
          variant: "destructive",
          title: "Sign in required",
          description: "Please sign in to connect Strava.",
        });
        return;
      }
      initiateStravaAuth(user.id);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Couldn’t start Strava connect",
        description: "Please try again.",
      });
    }

    localStorage.setItem("last_oauth_provider", "strava");
  };

  const handleSpotifyConnect = async () => {
    if (!spotifyClientId) {
      toast({
        variant: "destructive",
        title: "Spotify not configured",
        description: "Add VITE_SPOTIFY_CLIENT_ID to your .env, then restart the dev server.",
      });
      return;
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast({
          variant: "destructive",
          title: "Sign in required",
          description: "Please sign in to connect Spotify.",
        });
        return;
      }
      initiateSpotifyAuth(user.id);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Couldn’t start Spotify connect",
        description: "Please try again.",
      });
    }

    localStorage.setItem("last_oauth_provider", "spotify");
  };

  const canConnectStrava = useMemo(
    () => !!userId && !stravaConnected && !checkingStravaStatus,
    [userId, stravaConnected, checkingStravaStatus],
  );

  const canConnectSpotify = useMemo(
    () => !!userId && !!spotifyClientId && !spotifyConnected && !checkingSpotifyStatus,
    [userId, spotifyClientId, spotifyConnected, checkingSpotifyStatus],
  );

  const handleStravaDisconnect = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to disconnect Strava.",
      });
      return;
    }

    try {
      setStravaDisconnecting(true);
      await disconnectStrava(userId);
      localStorage.removeItem("strava_connected");
      setStravaConnected(false);
      toast({
        title: "Strava disconnected",
        description: "You can reconnect anytime.",
      });
    } catch (error) {
      console.error("Failed to disconnect Strava", error);
      toast({
        variant: "destructive",
        title: "Couldn’t disconnect",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setStravaDisconnecting(false);
    }
  };

  const handleSpotifyDisconnect = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to disconnect Spotify.",
      });
      return;
    }

    try {
      setSpotifyDisconnecting(true);
      await disconnectSpotify(userId);
      localStorage.removeItem("spotify_connected");
      setSpotifyConnected(false);
      toast({
        title: "Spotify disconnected",
        description: "You can reconnect anytime.",
      });
    } catch (error) {
      console.error("Failed to disconnect Spotify", error);
      toast({
        variant: "destructive",
        title: "Couldn’t disconnect",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSpotifyDisconnecting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_25%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#ffffff0f_1px,transparent_0)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4">
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
              Settings
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold leading-tight text-white">Control center</h1>
            <p className="max-w-2xl text-slate-300">
              Manage your account, integrations, and activity sync so your AI friend stays in the loop.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Secure by design
            </span>
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
              <Sparkles className="h-4 w-4 text-blue-200" />
              Auto-sync ready
            </span>
          </div>
        </div>

        <Card className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
              <Link2 className="h-5 w-5 text-blue-200" />
              Integrations
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-orange-500/80 via-orange-500/70 to-amber-400/60 p-4 shadow-lg shadow-orange-900/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/strava-icon.svg"
                  alt="Strava"
                  className="h-7 w-7"
                />
                <div>
                  <p className="font-medium text-white">Strava</p>
                  <p className="text-sm text-white/80">
                    Sync your runs, rides & workouts
                  </p>
                </div>
              </div>

              {stravaConnected ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {checkingStravaStatus ? "Checking..." : "Connected"}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleStravaDisconnect}
                    className="rounded-full border border-white/20 bg-white/20 px-4 text-white hover:bg-white/30"
                    disabled={stravaDisconnecting || checkingStravaStatus}
                  >
                    {stravaDisconnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStravaConnect}
                  className="rounded-full border border-white/20 bg-white/20 px-4 text-white hover:bg-white/30"
                  disabled={!canConnectStrava || stravaConnecting}
                >
                  {stravaConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </div>

            <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#1DB954]/85 via-[#1ed760]/60 to-[#0f3d2e]/75 p-4 shadow-lg shadow-emerald-900/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/spotify-icon.svg"
                  alt="Spotify"
                  className="h-10 w-10 rounded-full bg-black/10 p-1.5 shadow-lg shadow-black/20"
                />
                <div>
                  <p className="font-medium text-white">Spotify</p>
                  <p className="text-sm text-white/80">
                    Bring in your recent listening
                  </p>
                </div>
              </div>

              {spotifyConnected ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {checkingSpotifyStatus ? "Checking..." : "Connected"}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSpotifyDisconnect}
                    className="rounded-full border border-white/20 bg-white/20 px-4 text-white hover:bg-white/30"
                    disabled={spotifyDisconnecting || checkingSpotifyStatus}
                  >
                    {spotifyDisconnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSpotifyConnect}
                  className="rounded-full border border-white/20 bg-white/20 px-4 text-white hover:bg-white/30"
                  disabled={!canConnectSpotify || spotifyConnecting}
                >
                  {spotifyConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
