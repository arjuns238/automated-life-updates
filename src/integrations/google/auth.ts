// src/integrations/google/auth.ts
interface GoogleConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
  apiBase: string;
}

const config: GoogleConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
  redirectUri:
    (import.meta.env.VITE_GOOGLE_REDIRECT_URI as string) ||
    `${window.location.origin}/settings`,
  scope: "https://www.googleapis.com/auth/calendar.readonly",
  apiBase: (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000",
};

export const initiateGoogleAuth = (userId: string) => {
  if (!config.clientId) throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    state: userId,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  window.location.href = authUrl;
};

export const handleGoogleCallback = async (code: string, userId?: string) => {
  const finalUserId = userId?.trim();
  if (!finalUserId) {
    throw new Error("Missing user ID for Google token exchange");
  }

  const res = await fetch(`${config.apiBase}/api/google/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, user_id: finalUserId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Google token exchange failed:", res.status, text);
    throw new Error(`Failed to exchange Google code (status ${res.status})`);
  }

  return res.json();
};

export const getGoogleStatus = async (userId: string) => {
  const url = new URL(`${config.apiBase}/api/google/status`);
  url.searchParams.set("user_id", userId);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Google status: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ connected: boolean }>;
};

export const disconnectGoogle = async (userId: string) => {
  const res = await fetch(`${config.apiBase}/api/google/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to disconnect Google: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ disconnected: boolean }>;
};

interface FetchEventsOptions {
  maxResults?: number;
  timeMin?: string;
  timeMax?: string;
}

export interface CalendarSettings {
  only_personal_calendars: boolean;
  work_calendars: boolean;
  include_all_day_events: boolean;
  include_regular_meetings: boolean;
  include_locations: boolean;
}

export const defaultCalendarSettings: CalendarSettings = {
  only_personal_calendars: true,
  work_calendars: false,
  include_all_day_events: true,
  include_regular_meetings: false,
  include_locations: false,
};

export type SanitizedCalendarEvent = {
  id: string;
  label: string;
  window: string;
  location?: string | null;
  bullet: string;
};

export const fetchGoogleEvents = async (userId: string, options: FetchEventsOptions = {}) => {
  const url = new URL(`${config.apiBase}/api/google/events`);
  url.searchParams.set("user_id", userId);
  if (options.maxResults) url.searchParams.set("max_results", String(options.maxResults));
  if (options.timeMin) url.searchParams.set("time_min", options.timeMin);
  if (options.timeMax) url.searchParams.set("time_max", options.timeMax);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Google events: ${res.status} ${text}`);
  }
  return res.json() as Promise<{
    events: SanitizedCalendarEvent[];
    bullets: string[];
    settings: CalendarSettings;
  }>;
};

export const getGooglePreferences = async (userId: string) => {
  const url = new URL(`${config.apiBase}/api/google/preferences`);
  url.searchParams.set("user_id", userId);
  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load calendar preferences: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ settings: CalendarSettings }>;
};

export const updateGooglePreferences = async (userId: string, settings: CalendarSettings) => {
  const res = await fetch(`${config.apiBase}/api/google/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, settings }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to save calendar preferences: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ settings: CalendarSettings }>;
};
