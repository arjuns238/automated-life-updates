// src/integrations/strava/auth.ts
interface StravaConfig {
  clientId: string;
  redirectUri: string;   // must match Strava app settings exactly
  scope: string;         // space-separated scopes, Strava encodes them
  apiBase: string;       // your FastAPI base URL
}

const config: StravaConfig = {
  clientId: import.meta.env.VITE_STRAVA_CLIENT_ID as string,
  // Prefer an explicit env; fall back to current origin + /settings
  redirectUri:
    (import.meta.env.VITE_STRAVA_REDIRECT_URI as string) ||
    `${window.location.origin}/settings`,
  // Strava expects a comma-separated scope list
  scope: "read,activity:read_all",
  // Backend base URL (so you can switch to proxy later)
  apiBase: (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000",
};

/**
 * Kick off the Strava OAuth flow.
 * Pass the current user's UUID as `state` so the backend knows who to save tokens for.
 */
export const initiateStravaAuth = (userId: string) => {
  if (!config.clientId) throw new Error("Missing VITE_STRAVA_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: String(config.clientId),
    redirect_uri: config.redirectUri,              // e.g. http://localhost:8080/settings
    response_type: "code",
    scope: config.scope,                           // space-separated; will be URL-encoded
    state: userId,                                 // critical: links tokens → user
    // Force Strava to show the account/consent screen so users can switch accounts after disconnecting.
    approval_prompt: "force",
  });
  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  window.location.href = authUrl;
};

/**
 * Handle the callback on /settings (reads ?code=... & ?state=... in your Settings page).
 * For convenience this function accepts both directly; read them with useSearchParams().
 */

// auth.ts (already returning non-ok text; keep it)
export const handleStravaCallback = async (code: string, userId?: string) => {
  const finalUserId = userId?.trim();
  if (!finalUserId) {
    throw new Error("Missing user ID for Strava token exchange");
  }

  const res = await fetch(`${config.apiBase}/api/strava/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, user_id: finalUserId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Token exchange failed:", res.status, text);
    throw new Error(`Failed to exchange code (status ${res.status})`);
  }

  return res.json();
};

export const getStravaStatus = async (userId: string) => {
  const url = new URL(`${config.apiBase}/api/strava/status`);
  url.searchParams.set("user_id", userId);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Strava status: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ connected: boolean }>;
};

export const disconnectStrava = async (userId: string) => {
  const res = await fetch(`${config.apiBase}/api/strava/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to disconnect Strava: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ disconnected: boolean }>;
};
