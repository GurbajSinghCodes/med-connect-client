import Constants from "expo-constants";
import { Platform } from "react-native";

const PRODUCTION_URL = "https://medconnect.hostless.app/";

function resolveApiUrl(): string {
  // 1. Explicit override from .env — highest priority
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.replace(/\/$/, "");
  }

  // 2. Web in development — always talk to the local backend
  if (Platform.OS === "web") {
    if (__DEV__) {
      return "http://localhost:5000";
    }
    // Web in production build — use the deployed backend
    return PRODUCTION_URL;
  }

  // 3. Native in development — infer from Metro host
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(":")[0];

      // Tunnel mode — the local backend isn't reachable through the tunnel
      if (host.includes("exp.direct") || host.includes("ngrok")) {
        return PRODUCTION_URL;
      }

      return `http://${host}:5000`;
    }
  }

  // 4. Native production build (APK/AAB)
  return PRODUCTION_URL;
}

export const API_URL = resolveApiUrl();

console.log(
  "[config] API_URL:",
  API_URL,
  "| DEV:",
  __DEV__,
  "| platform:",
  Platform.OS,
);
