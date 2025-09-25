import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { initiateStravaAuth } from "@/integrations/strava/auth";

export default function Integrations() {
  const handleStravaConnect = () => {
    initiateStravaAuth();
  };

  return (
    <Card className="shadow-lg border border-border/50 rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Link2 className="w-5 h-5 text-primary" />
          Integrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strava Card */}
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
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStravaConnect}
            className="bg-white/20 text-white hover:bg-white/30 rounded-full px-4"
          >
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
