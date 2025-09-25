import { useNavigate, useSearchParams, Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Link2, Bell, Shield } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { initiateStravaAuth, handleStravaCallback } from "@/integrations/strava/auth";
import Profile from "./settings/Profile";
import Integrations from "./settings/Integrations";
import Notifications from "./settings/Notifications";
import Privacy from "./settings/Privacy";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const processStravaAuth = async () => {
      const code = sessionStorage.getItem("stravaAuthCode");
      if (searchParams.get("auth") === "strava" && code) {
        try {
          await handleStravaCallback(code);
          sessionStorage.removeItem("stravaAuthCode");
          toast({
            title: "Successfully connected to Strava!",
            description: "Your activities will now be synced automatically.",
          });
        } catch (error) {
          console.error("Error connecting to Strava:", error);
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: "Unable to connect to Strava. Please try again.",
          });
        }
        navigate("/settings", { replace: true });
      }
    };
    processStravaAuth();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background text-blue-700">
      {/* Sidebar */}
      <aside className="w-56 bg-white/70 backdrop-blur-md shadow-md flex flex-col py-6 gap-6">
        <div className="px-4">
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700 mb-6"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={20} /> Back
          </Button>
        </div>
        <nav className="flex flex-col gap-2 w-full px-4">
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700"
            onClick={() => navigate("/settings/profile")}
          >
            <User size={20} /> Profile
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700"
            onClick={() => navigate("/settings/integrations")}
          >
            <Link2 size={20} /> Integrations
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700"
            onClick={() => navigate("/settings/notifications")}
          >
            <Bell size={20} /> Notifications
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 rounded-xl hover:bg-blue-100 text-blue-700"
            onClick={() => navigate("/settings/privacy")}
          >
            <Shield size={20} /> Privacy
          </Button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-8">
        <h1 className="text-3xl font-bold tracking-tight text-blue-700 mb-6">
          Settings
        </h1>
        <p className="text-muted-foreground mb-8">
          Manage your account and connect services to automatically sync your activities.
        </p>

        <div className="settings-content flex-1">
          <Routes>
            <Route path="profile" element={<Profile />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="privacy" element={<Privacy />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
