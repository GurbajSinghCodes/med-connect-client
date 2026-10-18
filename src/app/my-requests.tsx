import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SkeletonList } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type Request } from "../lib/api";
const POLL_INTERVAL_MS = 30000;
export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const { setOpenRequestCount } = useAuth();
  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const list = await api.getMyRequests();
      setRequests(list);
      setOpenRequestCount(list.filter((r) => r.status === "open").length);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      setError(msg);
    }
  }, [setOpenRequestCount]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await fetchRequests();
        if (active) setLoading(false);
      })();
      const id = setInterval(fetchRequests, POLL_INTERVAL_MS);
      return () => {
        active = false;
        clearInterval(id);
      };
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
    const doCancel = async () => {
      setActingOn(requestId);
      try {
        await api.cancelRequest(requestId);
        await fetchRequests();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Cancel failed";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      } finally {
        setActingOn(null);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm("Cancel request? Pharmacies will stop being notified.")
      ) {
        doCancel();
      }
      return;
    }

    Alert.alert("Cancel request?", "Pharmacies will stop being notified.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel request", style: "destructive", onPress: doCancel },
    ]);
  };

  if (loading) {
    return <SkeletonList count={3} />;
  }

  return (
    <>
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
          <Pressable
            onPress={() => router.push(`/requests/${item._id}` as any)}
          >
            <RequestCard
              request={item}
              busy={actingOn === item._id}
              onFulfill={(pharmacyId) => handleFulfill(item._id, pharmacyId)}
              onCancel={() => handleCancel(item._id)}
              onViewImage={(url) => setViewerUrl(url)}
            />
          </Pressable>
        )}
      />

      {/* Fullscreen image viewer */}
      <Modal
        visible={viewerUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUrl(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setViewerUrl(null)}
        >
          {viewerUrl && (
            <Image
              source={{ uri: viewerUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={styles.modalClose}
            onPress={() => setViewerUrl(null)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------- Request card ----------

function RequestCard({
  request,
  busy,
  onFulfill,
  onCancel,
  onViewImage,
}: {
  request: Request;
  busy: boolean;
  onFulfill: (pharmacyId: string) => void;
  onCancel: () => void;
  onViewImage: (url: string) => void;
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
  const hasImages =
    Array.isArray(request.prescriptionImages) &&
    request.prescriptionImages.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.medicineName}>
          {request.medicineName || "Prescription uploaded"}
        </Text>
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
      {/* Flag warning banner */}
      {request.needsReupload ? (
        <View style={styles.flagBannerDanger}>
          <Text style={styles.flagBannerTitle}>
            ⚠ Prescription flagged by pharmacies
          </Text>
          <Text style={styles.flagBannerText}>
            Reupload a clearer photo to keep this request active. Tap for
            details.
          </Text>
        </View>
      ) : request.flaggedBy && request.flaggedBy.length > 0 ? (
        <View style={styles.flagBannerWarn}>
          <Text style={styles.flagBannerTitleWarn}>
            ⚠ {request.flaggedBy.length} pharmac
            {request.flaggedBy.length === 1 ? "y" : "ies"} flagged this
          </Text>
        </View>
      ) : null}
      {hasImages && (
        <View style={styles.imageStrip}>
          {request.prescriptionImages!.map((url, i) => (
            <Pressable
              key={i}
              onPress={() => onViewImage(url)}
              style={styles.thumbWrap}
            >
              <Image source={{ uri: url }} style={styles.thumb} />
            </Pressable>
          ))}
        </View>
      )}

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
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  if (isNaN(then)) return "unknown";
  const absDiff = Math.abs(diff);
  const sec = Math.floor(absDiff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
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

  imageStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  thumbWrap: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  thumb: { width: 64, height: 64 },

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

  // Fullscreen viewer
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "80%",
  },
  modalClose: {
    position: "absolute",
    bottom: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  modalCloseText: { color: "#000", fontWeight: "700", fontSize: 15 },
  flagBannerDanger: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fef2f1",
    borderWidth: 1,
    borderColor: "#f5b8b3",
  },
  flagBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#c8372d",
    letterSpacing: -0.2,
  },
  flagBannerText: {
    fontSize: 12,
    color: "#8a1f17",
    marginTop: 4,
    lineHeight: 16,
  },
  flagBannerWarn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fef7ed",
    borderWidth: 1,
    borderColor: "#f0d5a8",
  },
  flagBannerTitleWarn: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b45309",
  },
});
