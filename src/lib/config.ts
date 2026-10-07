import Constants from "expo-constants";

/**
 * The backend API base URL.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL from .env (best for production / fixed IPs)
 *   2. Auto-detected from Expo's dev-server host (works with no config)
 *   3. localhost (last-resort fallback)
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, ""); // trim trailing slash
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:5000`;
  }

  return "http://localhost:5000";
}

export const API_URL = resolveApiUrl();
