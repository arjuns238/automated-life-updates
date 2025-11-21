// src/integrations/spotify/auth.ts
import { API_BASE_URL } from "@/lib/apiBase";

interface SpotifyConfig {
  clientId: string;
  redirectUri: string;   // must match Spotify app settings exactly
  scope: string;         // space-separated scopes
  apiBase: string;       // your FastAPI base URL
}

const config: SpotifyConfig = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID as string,
  redirectUri:
    (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string) ||
    `${window.location.origin}/settings`,
  scope: "user-read-email user-read-private user-read-recently-played user-top-read",
  apiBase: API_BASE_URL,
};

/**
 * Kick off the Spotify OAuth flow.
 * Pass the current user's UUID as `state` so the backend knows who to save tokens for.
 */
export const initiateSpotifyAuth = (userId: string) => {
  if (!config.clientId) throw new Error("Missing VITE_SPOTIFY_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: String(config.clientId),
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    state: userId,
    // Always show the Spotify account picker/consent dialog so users can switch accounts after disconnecting.
    show_dialog: "true",
  });
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  window.location.href = authUrl;
};

export const handleSpotifyCallback = async (code: string, userId?: string) => {
  const finalUserId = userId?.trim();
  if (!finalUserId) {
    throw new Error("Missing user ID for Spotify token exchange");
  }

  const res = await fetch(`${config.apiBase}/api/spotify/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, user_id: finalUserId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Spotify token exchange failed:", res.status, text);
    throw new Error(`Failed to exchange Spotify code (status ${res.status})`);
  }

  return res.json();
};

export const getSpotifyStatus = async (userId: string) => {
  const url = new URL(`${config.apiBase}/api/spotify/status`);
  url.searchParams.set("user_id", userId);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Spotify status: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ connected: boolean }>;
};

export const disconnectSpotify = async (userId: string) => {
  const res = await fetch(`${config.apiBase}/api/spotify/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to disconnect Spotify: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ disconnected: boolean }>;
};
