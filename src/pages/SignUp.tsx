import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/apiBase";

import { Loader2, Sparkles, UserPlus } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchWithTimeout = async (input: RequestInfo, init: RequestInit, timeoutMs: number) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Account created successfully.",
      });
      navigate("/this-month");
    }
  };

  const handleGuestSignIn = async () => {
    setGuestLoading(true);
    try {
      const maxAttempts = 3;
      const timeoutMs = 15000;
      let data: { email: string; password: string } | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const res = await fetchWithTimeout(
            `${API_BASE_URL}/api/guest/session`,
            { method: "POST" },
            timeoutMs,
          );
          if (!res.ok) {
            const text = await res.text().catch(() => "Unknown error");
            throw new Error(`Failed to create guest session: ${res.status} ${text}`);
          }
          data = await res.json();
          break;
        } catch (err) {
          const isAbort = err instanceof DOMException && err.name === "AbortError";
          const isNetworkError = err instanceof TypeError;
          if ((isAbort || isNetworkError) && attempt < maxAttempts) {
            toast({
              title: "Waking the server...",
              description: "Guest sign-in can take a moment. Retrying now.",
            });
            await delay(1000 * attempt);
            continue;
          }
          throw err;
        }
      }

      if (!data) {
        throw new Error("Could not start guest session.");
      }

      const { email: guestEmail, password: guestPassword } = data;

      const { error } = await supabase.auth.signInWithPassword({
        email: guestEmail,
        password: guestPassword,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "You're in as a guest",
        description: "Feel free to explore. Save your work by creating an account later.",
      });
      navigate("/this-month");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start guest session.";
      toast({
        title: "Guest access failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_80%_8%,rgba(236,72,153,0.18),transparent_36%),radial-gradient(circle_at_52%_82%,rgba(59,130,246,0.16),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),rgba(0,0,0,0.25))]" />
      </div>

      <div className="relative z-10 px-4 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">
          <div className="space-y-5 text-center lg:w-1/2 lg:text-left">
            <div className="space-y-3">
              <h1 className="text-5xl font-semibold md:text-4xl">
                daily
              </h1>
              <h2 className="text-2xl font-semibold md:text-4xl">
                A memory layer for your life.
              </h2>
              <p className="text-sm text-gray-300 md:text-base">
                daily collects the memories you create and
                brings them together. It uses the signals you already generate
                to help you remember not just what happened, but how each chapter fit together.
              </p>
            </div>
          </div>

          <Card className="w-full max-w-md border-white/10 bg-white/5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:w-1/2">
            <CardHeader className="space-y-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UserPlus className="w-6 h-6 text-cyan-200" />
                Create your account
              </CardTitle>
              <p className="text-sm text-gray-300">
                Own your guest history, integrate with services you use, and keep building the wrap.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">Email</label>
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-gray-400 focus-visible:ring-cyan-300 focus-visible:ring-offset-0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">Password</label>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-gray-400 focus-visible:ring-cyan-300 focus-visible:ring-offset-0"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-white text-black shadow-[0_16px_50px_rgba(0,0,0,0.45)] transition hover:bg-gray-200 focus-visible:ring-offset-[#05060a]"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing up...
                    </>
                  ) : (
                    <>Sign Up</>
                  )}
                </Button>
                <div className="text-center text-sm text-gray-400">or</div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:bg-white/15 focus-visible:ring-offset-[#05060a]"
                  size="lg"
                  disabled={guestLoading || loading}
                  onClick={handleGuestSignIn}
                >
                  {guestLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Continuing as guest...
                    </>
                  ) : (
                    <>Continue as guest</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-gray-300 hover:text-white"
                  onClick={() => navigate("/sign-in")}
                >
                  Already have an account? Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
