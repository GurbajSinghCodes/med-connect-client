import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { api, type PharmacyPublic } from "../../lib/api";
import { openDirections } from "../../lib/maps";

export default function PharmacyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [pharmacy, setPharmacy] = useState<PharmacyPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getPublicPharmacy(id);
      setPharmacy(data);
    } catch (err: any) {
      setError(err?.message || "Couldn't load pharmacy");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !pharmacy) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>{error || "Pharmacy not found"}</Text>
        <Pressable style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const [lng, lat] = pharmacy.location.coordinates;
  const isOpen = pharmacy.isOpenNow;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{pharmacy.name}</Text>

      <View
        style={[
          styles.badge,
          isOpen === true
            ? styles.badgeOpen
            : isOpen === false
              ? styles.badgeClosed
              : styles.badgeUnknown,
        ]}
      >
        <Text style={styles.badgeText}>
          {isOpen === true
            ? "Open now"
            : isOpen === false
              ? "Closed"
              : "Hours not set"}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Address</Text>
      <Text style={styles.sectionValue}>{pharmacy.address}</Text>

      {pharmacy.openingTime && pharmacy.closingTime && (
        <>
          <Text style={styles.sectionLabel}>Hours</Text>
          <Text style={styles.sectionValue}>
            {pharmacy.openingTime} – {pharmacy.closingTime}
          </Text>
        </>
      )}

      {pharmacy.contactNumber && (
        <>
          <Text style={styles.sectionLabel}>Contact</Text>
          <Pressable
            onPress={() =>
              Linking.openURL(
                `tel:${pharmacy.contactCountryCode || "+91"}${pharmacy.contactNumber}`,
              )
            }
          >
            <Text style={styles.phone}>
              {pharmacy.contactCountryCode || "+91"} {pharmacy.contactNumber}
            </Text>
          </Pressable>
        </>
      )}

      <Text style={styles.sectionLabel}>Coordinates</Text>
      <Text style={styles.coords}>
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </Text>

      <Pressable
        style={styles.directionsBtn}
        onPress={() => openDirections(lat, lng, pharmacy.name)}
      >
        <Text style={styles.directionsText}>Get directions</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  errorTitle: { fontSize: 15, color: "#c62828", fontWeight: "600" },

  container: { padding: 24, paddingTop: 60, gap: 6 },

  name: { fontSize: 26, fontWeight: "700", marginBottom: 8 },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOpen: { backgroundColor: "#d4f4d8" },
  badgeClosed: { backgroundColor: "#f4d4d4" },
  badgeUnknown: { backgroundColor: "#eee" },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#333" },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
  },
  sectionValue: { fontSize: 15, color: "#333", marginTop: 4, lineHeight: 21 },

  phone: {
    fontSize: 16,
    color: "#007aff",
    fontWeight: "600",
    marginTop: 4,
  },
  coords: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  directionsBtn: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: "#007aff",
    alignItems: "center",
  },
  directionsText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkText: { color: "#007aff", fontWeight: "600", fontSize: 14 },
});

import { Platform } from "react-native";

