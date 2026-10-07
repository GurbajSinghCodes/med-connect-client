import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, ApiError, type PharmacyPublic } from "../lib/api";

export default function PharmaciesScreen() {
  const router = useRouter();

  const [pharmacies, setPharmacies] = useState<PharmacyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);

  const fetchPharmacies = useCallback(async (lng: number, lat: number) => {
    try {
      setError(null);
      const list = await api.listNearbyPharmacies(lng, lat, 10000);
      setPharmacies(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    }
  }, []);

  const requestLocation = useCallback(async (): Promise<{
    longitude: number;
    latitude: number;
  } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location is required to find pharmacies near you.",
        );
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        longitude: pos.coords.longitude,
        latitude: pos.coords.latitude,
      };
    } catch (err: any) {
      Alert.alert("Location error", err.message || "Could not fetch location");
      return null;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLocating(true);
    const c = await requestLocation();
    setLocating(false);
    if (!c) {
      setLoading(false);
      return;
    }
    setCoords(c);
    await fetchPharmacies(c.longitude, c.latitude);
    setLoading(false);
  }, [requestLocation, fetchPharmacies]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const onRefresh = async () => {
    setRefreshing(true);
    const c = coords ?? (await requestLocation());
    if (c) {
      setCoords(c);
      await fetchPharmacies(c.longitude, c.latitude);
    }
    setRefreshing(false);
  };

  const useMyLocation = async () => {
    setLocating(true);
    const c = await requestLocation();
    setLocating(false);
    if (!c) return;
    setCoords(c);
    setLoading(true);
    await fetchPharmacies(c.longitude, c.latitude);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        {locating && <Text style={styles.hint}>Getting your location…</Text>}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby pharmacies</Text>
        <Pressable
          style={[styles.locBtn, locating && styles.btnDisabled]}
          onPress={useMyLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#007aff" size="small" />
          ) : (
            <Text style={styles.locBtnText}>📍 My location</Text>
          )}
        </Pressable>
      </View>

      {coords && (
        <Text style={styles.coordsText}>
          Showing results around {coords.latitude.toFixed(3)},{" "}
          {coords.longitude.toFixed(3)}
        </Text>
      )}

      <FlatList
        data={pharmacies}
        keyExtractor={(p) => p._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {error ? error : "No pharmacies found within 10 km."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PharmacyCard
            pharmacy={item}
            onPress={() => router.push(`/pharmacies/${item._id}`)}
          />
        )}
      />
    </View>
  );
}

function PharmacyCard({
  pharmacy,
  onPress,
}: {
  pharmacy: PharmacyPublic;
  onPress: () => void;
}) {
  const open = pharmacy.isOpenNow;
  const cc = pharmacy.contactCountryCode || "+91";

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{pharmacy.name}</Text>
        <View
          style={[
            styles.badge,
            open === true
              ? styles.badgeOpen
              : open === false
                ? styles.badgeClosed
                : styles.badgeUnknown,
          ]}
        >
          <Text style={styles.badgeText}>
            {open === true ? "Open" : open === false ? "Closed" : "—"}
          </Text>
        </View>
      </View>

      <Text style={styles.address} numberOfLines={2}>
        {pharmacy.address}
      </Text>

      {pharmacy.openingTime && pharmacy.closingTime && (
        <Text style={styles.meta}>
          Hours: {pharmacy.openingTime} – {pharmacy.closingTime}
        </Text>
      )}

      <View style={styles.actionRow}>
        {pharmacy.contactNumber ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              Linking.openURL(`tel:${cc}${pharmacy.contactNumber}`);
            }}
            style={[styles.actionBtn, styles.callBtn]}
          >
            <Text style={styles.callText}>📞 Call</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onPress();
          }}
          style={[styles.actionBtn, styles.detailsBtn]}
        >
          <Text style={styles.detailsText}>View details ›</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fafafa" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "700" },
  locBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#007aff",
    minWidth: 110,
    alignItems: "center",
  },
  locBtnText: { color: "#007aff", fontWeight: "700", fontSize: 12 },

  coordsText: {
    paddingHorizontal: 16,
    fontSize: 11,
    color: "#999",
    marginBottom: 8,
  },

  list: { padding: 16, paddingTop: 8, paddingBottom: 24 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  hint: { fontSize: 12, color: "#888" },
  emptyText: { color: "#888", textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 17, fontWeight: "700", flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeOpen: { backgroundColor: "#d4f4d8" },
  badgeClosed: { backgroundColor: "#f4d4d4" },
  badgeUnknown: { backgroundColor: "#eee" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#333" },

  address: { fontSize: 13, color: "#555", marginTop: 6 },
  meta: { fontSize: 12, color: "#888", marginTop: 4 },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  callBtn: { backgroundColor: "#f0f7ff" },
  callText: { color: "#007aff", fontWeight: "700", fontSize: 13 },
  detailsBtn: { backgroundColor: "#007aff" },
  detailsText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  btnDisabled: { opacity: 0.5 },
});
