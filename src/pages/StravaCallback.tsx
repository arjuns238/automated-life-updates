import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleStravaCallback } from '@/integrations/strava/auth';
import { useToast } from '@/components/ui/use-toast';

export default function StravaCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const processCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        
        if (!code) {
          throw new Error('No authorization code received');
        }

        await handleStravaCallback(code, state ?? undefined);

        // Only proceed if component is still mounted
        if (isMounted) {
          setIsProcessing(false);
          toast({
            title: 'Successfully connected to Strava!',
            description: 'Your activities will now be synced automatically.',
          });
          // Use replace instead of push to avoid navigation history issues
          navigate('/settings', { replace: true });
        }
      } catch (error) {
        // Only show error if component is still mounted
        if (isMounted) {
          console.error('Error processing Strava callback:', error);
          setIsProcessing(false);
          toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: error instanceof Error 
              ? error.message 
              : 'Unable to connect to Strava. Please try again.',
          });
          navigate('/settings', { replace: true });
        }
      }
    };

    processCallback();

    // Cleanup function to prevent memory leaks and state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">
          {isProcessing ? 'Connecting to Strava...' : 'Redirecting...'}
        </h2>
        <p className="text-muted-foreground">
          {isProcessing 
            ? 'Please wait while we complete the connection.'
            : 'Taking you back to settings...'}
        </p>
      </div>
    </div>
  );
}
