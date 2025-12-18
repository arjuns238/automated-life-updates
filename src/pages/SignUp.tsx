import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/apiBase";

import { Loader2, UserPlus } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      const res = await fetch(`${API_BASE_URL}/api/guest/session`, { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        throw new Error(`Failed to create guest session: ${res.status} ${text}`);
      }
      const data = await res.json();
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
    <div className="min-h-[calc(100vh-5rem)] bg-background flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="shadow-glow border border-border/60 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-primary" />
              Create your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing up...
                  </>
                ) : (
                  <>Sign Up</>
                )}
              </Button>
              <div className="text-center text-sm text-muted-foreground">or</div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                size="lg"
                disabled={guestLoading || loading}
                onClick={handleGuestSignIn}
              >
                {guestLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Continuing as guest...
                  </>
                ) : (
                  <>Continue as guest</>
                )}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => navigate("/sign-in")}>Already have an account? Sign In</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
