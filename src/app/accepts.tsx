import { useFocusEffect } from "expo-router";
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
import { api, ApiError, type Request } from "../lib/api";

const POLL_INTERVAL_MS = 5000;

export default function AcceptsScreen() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const list = await api.getNearbyRequests();
      // Show only requests this pharmacy engaged with
      const mine = list.filter(
        (r) => r.iAccepted === true || r.isChosen === true,
      );
      setRequests(mine);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchRequests();
      setLoading(false);
    })();
  }, [fetchRequests]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
      const id = setInterval(fetchRequests, POLL_INTERVAL_MS);
      return () => clearInterval(id);
    }, [fetchRequests]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
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
      data={requests}
      keyExtractor={(r) => r._id}
      contentContainerStyle={
        requests.length === 0 ? styles.emptyList : styles.list
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            {error ? "Couldn't load accepts" : "No accepts yet"}
          </Text>
          <Text style={styles.emptyHint}>
            {error
              ? error
              : "Requests you mark 'I have this' will show up here."}
          </Text>
        </View>
      }
      renderItem={({ item }) => <AcceptCard request={item} />}
    />
  );
}

function AcceptCard({ request }: { request: Request }) {
  const isChosen = request.isChosen === true;
  const isCancelled = request.status === "cancelled";
  const isFulfilled = request.status === "fulfilled";

  // Status label + colors in priority order
  let label = "Waiting for patient";
  let color = "#007aff";
  let bg = "#e3f0ff";

  if (isChosen) {
    label = "🎯 Patient chose you — coming to you";
    color = "#1d6b2a";
    bg = "#e7f5e8";
  } else if (isCancelled) {
    label = "Cancelled by patient";
    color = "#999";
    bg = "#f0f0f0";
  } else if (isFulfilled) {
    label = "Fulfilled elsewhere";
    color = "#999";
    bg = "#f0f0f0";
  }

  return (
    <View style={[styles.card, isChosen && styles.cardChosen]}>
      <View style={styles.cardHeader}>
        <Text style={styles.medicineName}>
          {request.medicineName || "Prescription uploaded"}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>

      {request.urgency === "urgent" && (
        <Text style={styles.urgentTag}>🚨 Urgent</Text>
      )}

      {request.description ? (
        <Text style={styles.description}>{request.description}</Text>
      ) : null}

      <Text style={styles.meta}>Submitted {timeAgo(request.createdAt)}</Text>

      {request.contactPhone && (
        <Pressable
          style={styles.callRow}
          onPress={() =>
            Linking.openURL(
              `tel:${request.contactCountryCode || "+91"}${request.contactPhone}`,
            )
          }
        >
          <Text style={styles.callIcon}>📞</Text>
          <Text style={styles.callText}>
            {request.contactCountryCode || "+91"} {request.contactPhone}
          </Text>
        </Pressable>
      )}

      {isChosen && (
        <View style={styles.chosenNotice}>
          <Text style={styles.chosenNoticeText}>
            The patient selected your pharmacy. They may be heading your way.
          </Text>
        </View>
      )}

      {isFulfilled && !isChosen && (
        <Text style={styles.fulfilledNote}>
          Fulfilled at {request.fulfilledBy?.name ?? "another pharmacy"}
        </Text>
      )}
    </View>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  list: { padding: 16, paddingTop: 60, gap: 12 },
  emptyList: { flexGrow: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#444" },
  emptyHint: { fontSize: 13, color: "#888", textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 6,
  },
  cardChosen: {
    borderColor: "#1d6b2a",
    borderWidth: 1.5,
    backgroundColor: "#f6fdf6",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  medicineName: { fontSize: 17, fontWeight: "700", flex: 1 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: "60%",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  urgentTag: { fontSize: 12, color: "#c62828", fontWeight: "600" },
  description: { fontSize: 13, color: "#555", marginTop: 2 },
  meta: { fontSize: 12, color: "#999", marginTop: 2 },

  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f0f7ff",
    alignSelf: "flex-start",
  },
  callIcon: { fontSize: 14 },
  callText: { color: "#007aff", fontWeight: "700", fontSize: 13 },

  chosenNotice: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#e7f5e8",
    borderWidth: 1,
    borderColor: "#b5ddb8",
  },
  chosenNoticeText: {
    color: "#1d6b2a",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },

  fulfilledNote: {
    marginTop: 8,
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
});
