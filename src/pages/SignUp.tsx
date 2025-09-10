

import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

import { Loader2, UserPlus } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      // navigate("/life-updates");
      navigate("/landing");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="shadow-glow">
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
              <Button type="button" variant="link" className="w-full" onClick={() => navigate("/sign-in")}>Already have an account? Sign In</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
