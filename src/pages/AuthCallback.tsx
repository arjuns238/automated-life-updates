import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

const parseHashParams = (hash: string) => {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(trimmed);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    const run = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get("code");

        if (code) {
          // Handles "Sign in with magic link" or confirmation links that return a code.
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("success");
          setMessage("Email confirmed. Redirecting you in a moment…");
          setTimeout(() => navigate("/this-month", { replace: true }), 800);
          return;
        }

        const { access_token, refresh_token } = parseHashParams(location.hash);
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
          setStatus("success");
          setMessage("Email confirmed. Redirecting you in a moment…");
          setTimeout(() => navigate("/this-month", { replace: true }), 800);
          return;
        }

        throw new Error("Missing verification parameters in the link.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Verification failed.";
        setStatus("error");
        setMessage(msg);
      }
    };

    run();
  }, [location.hash, location.search, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-center shadow-2xl backdrop-blur">
        {status === "pending" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-200" />
            <p className="text-sm text-slate-200">{message}</p>
          </div>
        )}
        {status === "success" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
            <p className="text-sm text-slate-200">{message}</p>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-300" />
            <p className="text-sm text-slate-200">{message}</p>
            <button
              className="text-xs text-cyan-200 underline decoration-cyan-200/70 underline-offset-4"
              onClick={() => navigate("/sign-in")}
            >
              Go back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
