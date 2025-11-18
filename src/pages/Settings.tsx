import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Link2, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  initiateStravaAuth,
  handleStravaCallback,
  getStravaStatus,
  disconnectStrava,
} from "@/integrations/strava/auth";
import { Sparkles, ShieldCheck } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connected, setConnected] = useState<boolean>(() => {
    const v = localStorage.getItem("strava_connected");
    return v === "true";
  });

  // Track whether we've already processed this callback to avoid duplicate exchanges
  const handledRef = useRef(false);

  // Get current signed-in user once
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

  // Sync the stored status with the backend once we know the user ID
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        setCheckingStatus(true);
        const status = await getStravaStatus(userId);
        if (cancelled) return;

        if (status.connected) {
          localStorage.setItem("strava_connected", "true");
        } else {
          localStorage.removeItem("strava_connected");
        }
        setConnected(status.connected);
      } catch (error) {
        console.error("Failed to fetch Strava status", error);
      } finally {
        if (!cancelled) {
          setCheckingStatus(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Handle Strava redirect (?code=...&state=... or ?error=access_denied)
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // we pass userId as state
    const error = searchParams.get("error");

    // If user canceled on Strava
    if (error) {
      toast({
        variant: "destructive",
        title: "Strava authorization cancelled",
        description: "You can try connecting again anytime.",
      });
      navigate("/settings", { replace: true });
      return;
    }

    if (!code) return;           // nothing to process
    if (handledRef.current) return; // prevent duplicate call
    handledRef.current = true;

    (async () => {
      try {
        setConnecting(true);

        // Safety: if state present, ensure it matches current user
        if (userId && state && userId !== state) {
          console.warn("OAuth state mismatch:", { userId, state });
          localStorage.removeItem("strava_connected");
          setConnected(false);
          toast({
            variant: "destructive",
            title: "Session changed",
            description:
              "Your session changed during authorization. Please try connecting again.",
          });
          return;
        }

        // Exchange the code for tokens on backend
        await handleStravaCallback(code, state ?? userId ?? undefined);

        // Mark as connected (local flag for now)
        localStorage.setItem("strava_connected", "true");
        setConnected(true);

        toast({
          title: "Connected to Strava 🎉",
          description: "Your activities can now be synced.",
        });
      } catch (e) {
        console.error("Strava connect failed:", e);
        localStorage.removeItem("strava_connected");
        setConnected(false);
        toast({
          variant: "destructive",
          title: "Connection failed",
          description:
            "We couldn’t complete the connection. Please try again.",
        });
      } finally {
        setConnecting(false);
        // Clean query params from the URL so reloads don't reuse the code
        navigate("/settings", { replace: true });
      }
    })();
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
      initiateStravaAuth(user.id); // include user id in OAuth state
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Couldn’t start Strava connect",
        description: "Please try again.",
      });
    }
  };

  const canConnect = useMemo(
    () => !!userId && !connected && !checkingStatus,
    [userId, connected, checkingStatus],
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
      setDisconnecting(true);
      await disconnectStrava(userId);
      localStorage.removeItem("strava_connected");
      setConnected(false);
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
      setDisconnecting(false);
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

              {connected ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {checkingStatus ? "Checking..." : "Connected"}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleStravaDisconnect}
                    className="rounded-full border border-white/20 bg-white/20 px-4 text-white hover:bg-white/30"
                    disabled={disconnecting || checkingStatus}
                  >
                    {disconnecting ? (
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
                  disabled={!canConnect || connecting}
                >
                  {connecting ? (
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
