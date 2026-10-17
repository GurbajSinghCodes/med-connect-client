import { useAuth } from "@/context/AuthContext";
import {
  getLastNotificationResponse,
  onNotificationResponse,
} from "@/lib/notifications";
import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * Listens for notification taps and routes to the corresponding request.
 * Handles two cases:
 *   1. Cold start — app was closed, user taps a notification to launch it
 *   2. Warm start — app is running/backgrounded, user taps a notification
 */
export default function NotificationHandler() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const { isLoading } = useAuth();
  const handledRef = useRef(false);

  const handleResponse = (response: any) => {
    const requestId = response?.notification?.request?.content?.data?.requestId;
    if (!requestId) {
      console.log("[notif] no requestId in notification payload");
      return;
    }

    console.log("[notif] routing to request", requestId);

    try {
      router.push(`/requests/${requestId}` as any);
    } catch (err) {
      console.warn("[notif] navigation failed:", err);
    }
  };

  // Cold start: check the notification that launched the app (once)
  useEffect(() => {
    if (isLoading) return;
    if (!navState?.key) return;
    if (handledRef.current) return;
    handledRef.current = true;

    (async () => {
      const response = await getLastNotificationResponse();
      if (response) {
        // Small delay so the router finishes its first render
        setTimeout(() => handleResponse(response), 300);
      }
    })();
  }, [isLoading, navState?.key]);

  // Warm start: subscribe to taps while the app is running
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const unsubscribe = await onNotificationResponse((response) => {
        if (!cancelled) handleResponse(response);
      });
      cleanup = unsubscribe;
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return null;
}
