import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Link2 } from "lucide-react";
import { initiateStravaAuth, handleStravaCallback } from "@/integrations/strava/auth";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const processStravaAuth = async () => {
      const code = sessionStorage.getItem('stravaAuthCode');
      if (searchParams.get('auth') === 'strava' && code) {
        try {
          await handleStravaCallback(code);
          sessionStorage.removeItem('stravaAuthCode');
          toast({
            title: 'Successfully connected to Strava!',
            description: 'Your activities will now be synced automatically.',
          });
        } catch (error) {
          console.error('Error connecting to Strava:', error);
          toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: 'Unable to connect to Strava. Please try again.',
          });
        }
        // Clean up the URL
        navigate('/settings', { replace: true });
      }
    };

    processStravaAuth();
  }, [searchParams, navigate, toast]);

  const handleStravaConnect = () => {
    initiateStravaAuth();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/')}
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

        {/* Integrations Section */}
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
                  <p className="text-white/80 text-sm">Sync your runs, rides & workouts</p>
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
      </div>
    </div>
  );
}
