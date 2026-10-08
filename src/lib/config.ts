import Constants from "expo-constants";

/**
 * The backend API base URL.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL from .env (explicit override)
 *   2. Auto-detected from Expo's dev-server host (local dev on LAN)
 *   3. Railway production URL (fallback when running standalone)
 *   4. localhost (last resort)
 */
const PRODUCTION_URL = "https://med-connect.up.railway.app";

function resolveApiUrl(): string {
  // 1. Explicit override from .env
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, "");
  }

  // 2. Local dev — infer from Metro's host
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];

    // Skip tunnel/ngrok hosts — they don't host the backend
    if (
      !host.includes("exp.direct") &&
      !host.includes("ngrok") &&
      host !== "localhost"
    ) {
      return `http://${host}:5000`;
    }
  }

  // 3. Production fallback
  return PRODUCTION_URL;
}

export const API_URL = resolveApiUrl();
