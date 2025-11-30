import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function Root() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleStravaCallback = () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const scope = params.get('scope');

      // If we have a code and scope, this is a Strava callback
      if (code && scope && scope.includes('activity:read_all')) {
        // Store the code in sessionStorage temporarily
        sessionStorage.setItem('stravaAuthCode', code);
        // Redirect to settings page which will handle the token exchange
        navigate('/settings?auth=strava');
        return true;
      }
      return false;
    };

    // Only handle callback if we're at the root path
    if (window.location.pathname === '/') {
      const isCallback = handleStravaCallback();
      // If not a callback and we're at root, show the index page
      if (!isCallback) {
        navigate('/this-month');
      }
    }
  }, [navigate]);

  return null; // This component just handles routing
}
