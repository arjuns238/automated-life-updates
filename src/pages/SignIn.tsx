import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff, Loader2, LogIn, Sparkles } from "lucide-react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/this-month");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_82%_12%,rgba(236,72,153,0.18),transparent_36%),radial-gradient(circle_at_50%_85%,rgba(59,130,246,0.16),transparent_34%)]" />
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
                Sign in to keep collecting memories.
              </h2>
            </div>
          </div>

          <Card className="w-full max-w-md border-white/10 bg-white/5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:w-1/2">
            <CardHeader className="space-y-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <LogIn className="h-6 w-6 text-cyan-200" />
                Sign in
              </CardTitle>
              <p className="text-sm text-gray-300">
                Welcome back. Enter your details to open your life summary and create update flows.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-5">
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
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="border-white/15 bg-white/5 pr-12 text-white placeholder:text-gray-400 focus-visible:ring-cyan-300 focus-visible:ring-offset-0"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
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
                      Signing in...
                    </>
                  ) : (
                    <>Sign In</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-gray-300 hover:text-white"
                  onClick={() => navigate("/sign-up")}
                >
                  Don't have an account? Sign Up
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
