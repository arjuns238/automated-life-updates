const DEFAULT_API_PORT = (import.meta.env.VITE_API_PORT as string) || "8000";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const resolveApiBaseUrl = () => {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (configured) {
    return stripTrailingSlash(configured);
  }

  if (typeof window === "undefined") {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  const { protocol, hostname, port } = window.location;
  const normalizedHostname = hostname || "localhost";

  const isDevPort = port && port !== "80" && port !== "443";
  if (isDevPort) {
    // In dev we serve the frontend on another port (e.g. 8080/4173)
    // so default to hitting the same host on the backend port.
    return `${protocol}//${normalizedHostname}:${DEFAULT_API_PORT}`;
  }

  const finalPort = port ? `:${port}` : "";
  return `${protocol}//${normalizedHostname}${finalPort}`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const buildApiUrl = (path: string) => {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
};
