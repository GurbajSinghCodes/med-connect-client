import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

async function getNotifications(): Promise<
  typeof import("expo-notifications") | null
> {
  try {
    const mod = await import("expo-notifications");
    return mod;
  } catch (err) {
    console.log(
      "[push] expo-notifications not available:",
      (err as Error).message,
    );
    return null;
  }
}

export async function getPushToken(): Promise<string | null> {
  if (isExpoGo()) {
    console.log("[push] Expo Go — remote push not supported, skipping");
    return null;
  }

  if (!Device.isDevice) {
    console.log("[push] not a physical device, skipping");
    return null;
  }

  const Notifications = await getNotifications();
  if (!Notifications) return null;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#007aff",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[push] permission denied");
      return null;
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    console.log("[push] device token acquired:", tokenData.type);
    return tokenData.data as string;
  } catch (err) {
    console.warn("[push] getDevicePushTokenAsync failed:", err);
    return null;
  }
}

export async function onNotificationReceived(
  handler: (n: any) => void,
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationReceivedListener(handler);
  return () => sub.remove();
}

export async function onNotificationResponse(
  handler: (r: any) => void,
): Promise<() => void> {
  const Notifications = await getNotifications();
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener(handler);
  return () => sub.remove();
}
