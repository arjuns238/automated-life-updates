import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Link2, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { initiateStravaAuth, handleStravaCallback } from "@/integrations/strava/auth";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [connecting, setConnecting] = useState(false);
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
        await handleStravaCallback(code, state ?? undefined);

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

  const canConnect = useMemo(() => !!userId && !connected, [userId, connected]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        <p className="text-muted-foreground mb-8">
          Manage your account and connect services to automatically sync your activities.
        </p>

        {/* Integrations */}
        <Card className="shadow-lg border border-border/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Link2 className="w-5 h-5 text-primary" />
              Integrations
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Strava */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-md">
              <div className="flex items-center gap-3">
                <img
                  src="/strava-icon.svg"
                  alt="Strava"
                  className="w-7 h-7"
                />
                <div>
                  <p className="text-white font-medium">Strava</p>
                  <p className="text-white/80 text-sm">
                    Sync your runs, rides & workouts
                  </p>
                </div>
              </div>

              {connected ? (
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStravaConnect}
                  className="bg-white/20 text-white hover:bg-white/30 rounded-full px-4"
                  disabled={!canConnect || connecting}
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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