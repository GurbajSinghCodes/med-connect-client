import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, ApiError, type Request } from "../../lib/api";

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getRequest(id);
      setRequest(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load request");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFulfill = async (pharmacyId: string) => {
    if (!request) return;
    setBusy(true);
    try {
      await api.fulfillRequest(request._id, pharmacyId);
      await load();
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (!request) return;
    Alert.alert("Cancel request?", "Pharmacies will stop being notified.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await api.cancelRequest(request._id);
            await load();
          } catch (err) {
            Alert.alert(
              "Error",
              err instanceof ApiError ? err.message : "Failed",
            );
          } finally {
            setBusy(false);
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

  if (error || !request) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>{error || "Request not found"}</Text>
        <Pressable style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

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
    <ScrollView contentContainerStyle={styles.container}>
      {/* Title + status */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
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

      {/* Description */}
      {request.description ? (
        <>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.sectionValue}>{request.description}</Text>
        </>
      ) : null}

      {/* Images */}
      {hasImages && (
        <>
          <Text style={styles.sectionLabel}>
            Prescription ({request.prescriptionImages!.length})
          </Text>
          <View style={styles.imageGrid}>
            {request.prescriptionImages!.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.imageThumb} />
            ))}
          </View>
        </>
      )}

      {/* Meta */}
      <Text style={styles.sectionLabel}>Submitted</Text>
      <Text style={styles.sectionValue}>
        {new Date(request.createdAt).toLocaleString()}
      </Text>

      <Text style={styles.sectionLabel}>Location</Text>
      <Text style={styles.sectionValue}>
        {request.location.coordinates[1].toFixed(5)},{" "}
        {request.location.coordinates[0].toFixed(5)}
      </Text>

      {request.contactPhone ? (
        <>
          <Text style={styles.sectionLabel}>Your contact</Text>
          <Text style={styles.sectionValue}>
            {request.contactCountryCode || "+91"} {request.contactPhone}
          </Text>
        </>
      ) : null}

      {/* Pharmacy responses */}
      <View style={styles.divider} />

      {isOpen && available.length === 0 && (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingTitle}>Notifying nearby pharmacies…</Text>
          <Text style={styles.waitingHint}>
            Responses will show here as they arrive. Tier {request.currentTier}{" "}
            of the search cascade.
          </Text>
        </View>
      )}

      {available.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>
            {available.length} pharmacy
            {available.length === 1 ? "" : "ies"} responded
          </Text>

          {available.map((a) => {
            const p = a.pharmacy;
            const isChosen = request.fulfilledBy?._id === p._id;

            return (
              <View
                key={p._id}
                style={[styles.pharmacyCard, isChosen && styles.pharmacyChosen]}
              >
                <View style={styles.pharmacyInfo}>
                  <Text style={styles.pharmacyName}>{p.name}</Text>
                  <Text style={styles.pharmacyAddr} numberOfLines={3}>
                    {p.address}
                  </Text>
                  {typeof a.distanceMeters === "number" && (
                    <Text style={styles.pharmacyDistance}>
                      📍 {formatDistance(a.distanceMeters)} from you
                    </Text>
                  )}
                  <Text style={styles.pharmacyMeta}>
                    Responded {timeAgo(a.markedAt)}
                  </Text>
                </View>

                {isChosen ? (
                  <View style={styles.chosenPill}>
                    <Text style={styles.chosenPillText}>✓ Chosen</Text>
                  </View>
                ) : isOpen ? (
                  <Pressable
                    style={[styles.fulfillBtn, busy && styles.btnDisabled]}
                    onPress={() => handleFulfill(p._id)}
                    disabled={busy}
                  >
                    <Text style={styles.fulfillText}>Fulfill</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </>
      )}

      {/* Fulfilled summary */}
      {request.status === "fulfilled" && request.fulfilledBy && (
        <View style={styles.fulfilledBox}>
          <Text style={styles.fulfilledTitle}>Fulfilled</Text>
          <Text style={styles.fulfilledLine}>{request.fulfilledBy.name}</Text>
          {request.fulfilledBy.address ? (
            <Text style={styles.fulfilledSub}>
              {request.fulfilledBy.address}
            </Text>
          ) : null}
          {typeof request.fulfilledByDistance === "number" && (
            <Text style={styles.fulfilledSub}>
              📍 {formatDistance(request.fulfilledByDistance)} from your request
              location
            </Text>
          )}
        </View>
      )}

      {/* Actions */}
      {isOpen && (
        <Pressable
          style={[styles.cancelBtn, busy && styles.btnDisabled]}
          onPress={handleCancel}
          disabled={busy}
        >
          <Text style={styles.cancelText}>Cancel request</Text>
        </Pressable>
      )}

      <Pressable style={styles.linkBtn} onPress={() => router.back()}>
        <Text style={styles.linkText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
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
    gap: 12,
  },
  errorTitle: { fontSize: 15, color: "#c62828", fontWeight: "600" },

  container: { padding: 24, paddingTop: 60, gap: 6 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { fontSize: 24, fontWeight: "700", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  urgentTag: {
    fontSize: 13,
    color: "#c62828",
    fontWeight: "700",
    marginTop: 4,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
  },
  sectionValue: { fontSize: 15, color: "#333", marginTop: 4, lineHeight: 21 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
    color: "#222",
  },

  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  imageThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#eee",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: 24,
    marginBottom: 8,
  },

  waitingBox: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#eee",
    marginTop: 12,
  },
  waitingTitle: { fontSize: 14, fontWeight: "700", color: "#666" },
  waitingHint: { fontSize: 12, color: "#888", marginTop: 4, lineHeight: 17 },

  pharmacyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    gap: 10,
    marginBottom: 8,
  },
  pharmacyChosen: {
    borderColor: "#1d6b2a",
    borderWidth: 2,
    backgroundColor: "#f6fdf6",
  },
  pharmacyInfo: { flex: 1, gap: 2 },
  pharmacyName: { fontSize: 15, fontWeight: "700" },
  pharmacyAddr: { fontSize: 12, color: "#666" },
  pharmacyDistance: { fontSize: 12, color: "#007aff", fontWeight: "600" },
  pharmacyMeta: { fontSize: 11, color: "#999", marginTop: 2 },

  fulfillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#007aff",
  },
  fulfillText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  chosenPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#e7f5e8",
  },
  chosenPillText: { color: "#1d6b2a", fontWeight: "700", fontSize: 12 },

  fulfilledBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#e7f5e8",
    borderWidth: 1,
    borderColor: "#b5ddb8",
    gap: 4,
  },
  fulfilledTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1d6b2a",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fulfilledLine: { fontSize: 16, fontWeight: "700", color: "#1d6b2a" },
  fulfilledSub: { fontSize: 13, color: "#1d6b2a" },

  cancelBtn: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  cancelText: { color: "#c62828", fontWeight: "600", fontSize: 14 },

  btnDisabled: { opacity: 0.5 },

  linkBtn: { paddingVertical: 16, alignItems: "center" },
  linkText: { color: "#007aff", fontWeight: "600", fontSize: 14 },
});
