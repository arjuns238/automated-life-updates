interface StravaConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

const config: StravaConfig = {
  clientId: import.meta.env.VITE_STRAVA_CLIENT_ID as string,
  redirectUri: window.location.origin, // Strava only allows base domain
  scope: 'activity:read_all',
};

export const initiateStravaAuth = () => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
  });

  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  window.location.href = authUrl;
};

export const handleStravaCallback = async (code: string) => {
  try {
    // Log the full URL with authorization code for debugging
    console.log('Received Strava callback with URL:', window.location.href);
    console.log('Authorization code:', code);

    // Send code to backend to exchange for token
    const response = await fetch('http://localhost:8080/api/strava/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};
