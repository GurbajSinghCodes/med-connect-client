import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, ApiError, type Request } from "../lib/api";

const POLL_INTERVAL_MS = 5000;

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const list = await api.getMyRequests();
      setRequests(list);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      setError(msg);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      await fetchRequests();
      setLoading(false);
    })();
  }, [fetchRequests]);

  // Poll only while this tab is focused
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

  const handleFulfill = async (requestId: string, pharmacyId: string) => {
    setActingOn(requestId);
    try {
      await api.fulfillRequest(requestId, pharmacyId);
      await fetchRequests();
      Alert.alert("Marked as fulfilled");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Action failed";
      Alert.alert("Error", msg);
    } finally {
      setActingOn(null);
    }
  };

  const handleCancel = (requestId: string) => {
    Alert.alert("Cancel request?", "Pharmacies will stop being notified.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: async () => {
          setActingOn(requestId);
          try {
            await api.cancelRequest(requestId);
            await fetchRequests();
          } catch (err) {
            const msg = err instanceof ApiError ? err.message : "Cancel failed";
            Alert.alert("Error", msg);
          } finally {
            setActingOn(null);
          }
        },
      },
    ]);
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
            {error ? "Couldn't load requests" : "No requests yet"}
          </Text>
          <Text style={styles.emptyHint}>
            {error
              ? error
              : "Submit one from the Home tab and it will appear here."}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          busy={actingOn === item._id}
          onFulfill={(pharmacyId) => handleFulfill(item._id, pharmacyId)}
          onCancel={() => handleCancel(item._id)}
        />
      )}
    />
  );
}

// ---------- Request card ----------

function RequestCard({
  request,
  busy,
  onFulfill,
  onCancel,
}: {
  request: Request;
  busy: boolean;
  onFulfill: (pharmacyId: string) => void;
  onCancel: () => void;
}) {
  const statusColor = {
    open: "#007aff",
    fulfilled: "#1d6b2a",
    cancelled: "#999",
  }[request.status];

  const statusBg = {
    open: "#e3f0ff",
    fulfilled: "#e7f5e8",
    cancelled: "#f0f0f0",
  }[request.status];

  const available = request.availableAt ?? [];
  const isOpen = request.status === "open";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.medicineName}>{request.medicineName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {request.status}
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

      {isOpen && available.length === 0 && (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>Notifying nearby pharmacies…</Text>
        </View>
      )}

      {available.length > 0 && (
        <View style={styles.pharmacyList}>
          <Text style={styles.sectionLabel}>
            {available.length} pharmacy
            {available.length === 1 ? "" : "ies"} responded:
          </Text>

          {available.map((a) => {
            const p = a.pharmacy;
            return (
              <View key={p._id} style={styles.pharmacyCard}>
                <View style={styles.pharmacyInfo}>
                  <Text style={styles.pharmacyName}>{p.name}</Text>
                  <Text style={styles.pharmacyAddr} numberOfLines={2}>
                    {p.address}
                  </Text>
                </View>

                {isOpen ? (
                  <Pressable
                    style={[styles.fulfillBtn, busy && styles.btnDisabled]}
                    onPress={() => onFulfill(p._id)}
                    disabled={busy}
                  >
                    <Text style={styles.fulfillText}>
                      {busy ? "…" : "Fulfill"}
                    </Text>
                  </Pressable>
                ) : request.fulfilledBy?._id === p._id ? (
                  <Text style={styles.chosenTag}>✓ Chosen</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {isOpen && (
        <Pressable
          style={[styles.cancelBtn, busy && styles.btnDisabled]}
          onPress={onCancel}
          disabled={busy}
        >
          <Text style={styles.cancelText}>Cancel request</Text>
        </Pressable>
      )}

      {request.status === "fulfilled" && request.fulfilledBy && (
        <View style={styles.fulfilledBox}>
          <Text style={styles.fulfilledText}>
            Fulfilled at {request.fulfilledBy.name}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------- Helpers ----------

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

// ---------- Styles ----------

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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  medicineName: { fontSize: 17, fontWeight: "700", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  urgentTag: { fontSize: 12, color: "#c62828", fontWeight: "600" },
  description: { fontSize: 13, color: "#555", marginTop: 2 },
  meta: { fontSize: 12, color: "#999", marginTop: 2 },

  waitingBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#eee",
  },
  waitingText: { fontSize: 13, color: "#888", textAlign: "center" },

  pharmacyList: { marginTop: 10, gap: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  pharmacyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
    gap: 10,
  },
  pharmacyInfo: { flex: 1 },
  pharmacyName: { fontSize: 14, fontWeight: "700" },
  pharmacyAddr: { fontSize: 12, color: "#777", marginTop: 2 },

  fulfillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#007aff",
  },
  fulfillText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chosenTag: { fontSize: 12, color: "#1d6b2a", fontWeight: "700" },

  cancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  cancelText: { color: "#c62828", fontWeight: "600", fontSize: 13 },

  btnDisabled: { opacity: 0.5 },

  fulfilledBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#e7f5e8",
    borderWidth: 1,
    borderColor: "#b5ddb8",
  },
  fulfilledText: { color: "#1d6b2a", fontWeight: "600", fontSize: 13 },
});
