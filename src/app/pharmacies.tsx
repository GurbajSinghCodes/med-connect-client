import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, ApiError, type PharmacyPublic } from "../lib/api";

const TEST_LOCATION = { longitude: 77.21, latitude: 28.614 };

export default function PharmaciesScreen() {
  const [pharmacies, setPharmacies] = useState<PharmacyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const list = await api.listNearbyPharmacies(
        TEST_LOCATION.longitude,
        TEST_LOCATION.latitude,
        10000,
      );
      setPharmacies(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchData();
      setLoading(false);
    })();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
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
      renderItem={({ item }) => <PharmacyCard pharmacy={item} />}
    />
  );
}

function PharmacyCard({ pharmacy }: { pharmacy: PharmacyPublic }) {
  const open = pharmacy.isOpenNow;

  return (
    <View style={styles.card}>
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

      <Text style={styles.address}>{pharmacy.address}</Text>

      {pharmacy.openingTime && pharmacy.closingTime && (
        <Text style={styles.meta}>
          Hours: {pharmacy.openingTime} – {pharmacy.closingTime}
        </Text>
      )}

      {pharmacy.contactNumber ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${pharmacy.contactNumber}`)}
          style={styles.callBtn}
        >
          <Text style={styles.callText}>Call {pharmacy.contactNumber}</Text>
        </Pressable>
      ) : (
        <Text style={styles.meta}>No contact number on file</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 60 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
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

  callBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#007aff",
    alignItems: "center",
  },
  callText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
