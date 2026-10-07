import { Linking, Platform } from "react-native";

/**
 * Opens the device's maps app with directions to the given coordinates.
 * Uses a search query if a label is provided, otherwise the raw coordinates.
 */
export function openDirections(lat: number, lng: number, label?: string): void {
  const query = label ? encodeURIComponent(label) : `${lat},${lng}`;

  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${lat},${lng}&q=${query}`,
    android: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  })!;

  Linking.openURL(url).catch(() => {
    // Fallback if no maps app handles the URL
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  });
}

/**
 * Opens the device's maps app centered on the given coordinates (no directions).
 */
export function openInMaps(lat: number, lng: number, label?: string): void {
  const query = label ? encodeURIComponent(label) : `${lat},${lng}`;

  const url = Platform.select({
    ios: `http://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
    android: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}`,
  })!;

  Linking.openURL(url);
}
