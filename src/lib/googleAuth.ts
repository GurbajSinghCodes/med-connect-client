import { Prompt, ResponseType, makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

export function useGoogleAuth() {
  const redirectUri =
    Platform.OS === "web"
      ? window.location.origin
      : makeRedirectUri({ scheme: "medconnect" });

  console.log("[googleAuth] redirectUri:", redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    scopes: ["openid", "email", "profile"],
    prompt: Prompt.SelectAccount,
    redirectUri,
    // The critical line:
    responseType: ResponseType.IdToken,
  });

  if (response) {
    if (response.type === "success") {
      console.log(
        "[googleAuth] success — hasIdToken:",
        !!response.params?.id_token,
        "keys:",
        Object.keys(response.params ?? {}),
      );
    } else if (response.type === "error") {
      console.log("[googleAuth] error:", {
        message: response.error?.message,
        code: response.error?.code,
      });
    } else {
      console.log("[googleAuth] response type:", response.type);
    }
  }

  return { request, response, promptAsync, redirectUri };
}
