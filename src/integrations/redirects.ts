/**
 * Resolve an OAuth redirect URI.
 * - By default we use the current origin so it works on LAN, ngrok, or Cloudflare tunnels.
 * - You can force an explicit env override by setting VITE_FORCE_REDIRECT_ENV=true
 *   and providing the provider-specific env (e.g., VITE_STRAVA_REDIRECT_URI).
 */
export const resolveRedirectUri = (envOverride?: string, forceEnv = false) => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : null;

  // Prefer live origin unless we explicitly force the env override.
  if (!forceEnv && origin && !origin.startsWith("file://")) {
    return `${origin}/settings`;
  }

  if (envOverride && envOverride.trim()) {
    return envOverride.trim();
  }

  // Fallback for SSR/build contexts.
  if (origin) return `${origin}/settings`;
  return "http://localhost:8080/settings";
};
