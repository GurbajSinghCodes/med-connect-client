import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type Request } from "../lib/api";
import { uploadToImageKit } from "../lib/imagekit";

const POLL_INTERVAL_MS = 5000;

type Urgency = "general" | "urgent";

export default function HomeScreen() {
  const { isPharmacy, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isPharmacy) return <IncomingRequests />;
  return <RequestForm />;
}

// ==================== PATIENT / GUEST SIDE ====================

function RequestForm() {
  const { user } = useAuth();

  const [medicineName, setMedicineName] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("general");

  const [phone, setPhone] = useState(user?.phone ?? "");

  const [coords, setCoords] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [locating, setLocating] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  // Sync phone when the logged-in user changes (e.g. logs in mid-session)
  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location is required so we can notify pharmacies near you.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        longitude: pos.coords.longitude,
        latitude: pos.coords.latitude,
      });
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (results.length > 0) setAddress(formatAddress(results[0]));
      } catch {}
    } catch (err: any) {
      Alert.alert("Location error", err.message || "Could not fetch location");
    } finally {
      setLocating(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "Allow photo access to upload prescriptions.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const url = await uploadToImageKit(result.assets[0].uri);
      setImages((prev) => [...prev, url]);
    } catch (err: any) {
      Alert.alert("Upload failed", err.message || "Try again");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!medicineName.trim()) {
      Alert.alert("Missing info", "Enter the medicine name.");
      return;
    }
    if (!coords) {
      Alert.alert("Location required", "Tap 'Use my location' first.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert(
        "Phone required",
        "Enter a valid 10-digit mobile number so the pharmacy can call you.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const req = await api.createRequest({
        medicineName: medicineName.trim(),
        description: description.trim() || undefined,
        urgency,
        longitude: coords.longitude,
        latitude: coords.latitude,
        prescriptionImages: images.length ? images : undefined,
        contactPhone: phone,
        contactCountryCode: user?.countryCode || "+91",
      });
      setLastRequestId(req._id);
      setMedicineName("");
      setDescription("");
      setUrgency("general");
      setImages([]);
      if (!user) setPhone("");
      Alert.alert(
        "Request submitted",
        "Nearby pharmacies are being notified. Check My Requests for updates.",
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Submission failed";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Request Medicine</Text>
        <Text style={styles.subtitle}>
          We'll notify nearby pharmacies that might have it.
        </Text>

        <Text style={styles.label}>Medicine name *</Text>
        <TextInput
          style={styles.input}
          value={medicineName}
          onChangeText={setMedicineName}
          placeholder="e.g. Insulin, Paracetamol"
          placeholderTextColor="#999"
          editable={!submitting}
        />

        <Text style={styles.label}>Contact phone *</Text>
        <View style={styles.phoneContainer}>
          <Text style={styles.phonePrefix}>+91</Text>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
            placeholder="98765 43210"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            maxLength={10}
            editable={!submitting}
          />
        </View>
        <Text style={styles.helpText}>
          {user
            ? "Pharmacies will call this number to confirm."
            : "Pharmacies will call this number to reach you."}
        </Text>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Dosage, brand, quantity…"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          editable={!submitting}
        />

        <Text style={styles.label}>Prescription (optional)</Text>
        <Text style={styles.helpText}>
          Upload a photo if you have a doctor's prescription.
        </Text>

        <View style={styles.imageRow}>
          {images.map((url, i) => (
            <View key={i} style={styles.imageThumbWrap}>
              <Image source={{ uri: url }} style={styles.imageThumb} />
              <Pressable
                style={styles.imageRemove}
                onPress={() =>
                  setImages((prev) => prev.filter((_, idx) => idx !== i))
                }
                disabled={submitting}
              >
                <Text style={styles.imageRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            style={styles.imageAddBtn}
            onPress={handlePickImage}
            disabled={uploading || submitting}
          >
            {uploading ? (
              <ActivityIndicator color="#007aff" />
            ) : (
              <Text style={styles.imageAddText}>+ Add</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.label}>Urgency</Text>
        <View style={styles.urgencyRow}>
          <Pressable
            style={[
              styles.urgencyBtn,
              urgency === "general" && styles.urgencyActive,
            ]}
            onPress={() => setUrgency("general")}
            disabled={submitting}
          >
            <Text
              style={[
                styles.urgencyText,
                urgency === "general" && styles.urgencyTextActive,
              ]}
            >
              General
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.urgencyBtn,
              urgency === "urgent" && styles.urgencyActive,
            ]}
            onPress={() => setUrgency("urgent")}
            disabled={submitting}
          >
            <Text
              style={[
                styles.urgencyText,
                urgency === "urgent" && styles.urgencyTextActive,
              ]}
            >
              Urgent
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Your location *</Text>
        <Pressable
          style={[
            styles.locationBtn,
            (submitting || locating) && styles.btnDisabled,
          ]}
          onPress={handleUseLocation}
          disabled={submitting || locating}
        >
          {locating ? (
            <ActivityIndicator color="#007aff" />
          ) : (
            <Text style={styles.locationBtnText}>
              {coords ? "Update location" : "Use my current location"}
            </Text>
          )}
        </Pressable>

        {coords && (
          <View style={styles.locationBox}>
            <Text style={styles.locationOk}>
              ✓ {address || "Location captured"}
            </Text>
            <Text style={styles.locationCoords}>
              {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        <Pressable
          style={[
            styles.submitBtn,
            (submitting || !coords) && styles.btnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || !coords}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit request</Text>
          )}
        </Pressable>

        {lastRequestId && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Request submitted</Text>
            <Text style={styles.successId}>ID: {lastRequestId.slice(-6)}</Text>
            <Text style={styles.successHint}>
              Check "My Requests" to see pharmacy responses.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==================== PHARMACY SIDE ====================

function IncomingRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const list = await api.getNearbyRequests();
      setRequests(list.filter((r) => r.status === "open"));
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

  const handleAvailable = async (requestId: string) => {
    setActingOn(requestId);
    try {
      await api.markAvailable(requestId);
      await fetchRequests();
      Alert.alert(
        "Marked as available",
        "The patient will see your pharmacy in their list.",
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Action failed";
      Alert.alert("Error", msg);
    } finally {
      setActingOn(null);
    }
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
            {error ? "Couldn't load requests" : "No incoming requests"}
          </Text>
          <Text style={styles.emptyHint}>
            {error ? error : "New requests near your shop will appear here."}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <IncomingCard
          request={item}
          busy={actingOn === item._id}
          onAvailable={() => handleAvailable(item._id)}
        />
      )}
    />
  );
}

function IncomingCard({
  request,
  busy,
  onAvailable,
}: {
  request: Request;
  busy: boolean;
  onAvailable: () => void;
}) {
  const handleFlag = () => {
    Alert.alert("Flag prescription", "Why is this unclear?", [
      { text: "Unreadable", onPress: () => doFlag("unreadable") },
      { text: "Not a prescription", onPress: () => doFlag("not_prescription") },
      { text: "Irrelevant", onPress: () => doFlag("irrelevant") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const doFlag = async (reason: string) => {
    try {
      await api.flagRequest(request._id, reason);
      Alert.alert(
        "Flagged",
        "The patient will be asked to reupload if enough pharmacies agree.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not flag");
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.medicineName}>{request.medicineName}</Text>
        {request.urgency === "urgent" && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>URGENT</Text>
          </View>
        )}
      </View>

      {request.description ? (
        <Text style={styles.description}>{request.description}</Text>
      ) : null}

      <Text style={styles.meta}>Submitted {timeAgo(request.createdAt)}</Text>

      {typeof request.distanceMeters === "number" && (
        <View style={styles.distanceRow}>
          <Text style={styles.distanceLabel}>
            📍 {formatDistance(request.distanceMeters)} away
          </Text>
        </View>
      )}

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

      {request.prescriptionImages && request.prescriptionImages.length > 0 && (
        <View style={styles.imageStrip}>
          {request.prescriptionImages.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.stripThumb} />
          ))}
        </View>
      )}

      {request.prescriptionImages && request.prescriptionImages.length > 0 && (
        <Pressable style={styles.flagBtn} onPress={handleFlag} disabled={busy}>
          <Text style={styles.flagText}>Flag prescription</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.availableBtn, busy && styles.btnDisabled]}
        onPress={onAvailable}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.availableBtnText}>I have this</Text>
        )}
      </Pressable>
    </View>
  );
}

// ==================== HELPERS ====================

function formatAddress(a: Location.LocationGeocodedAddress): string {
  const parts = [
    a.name,
    a.street,
    a.district,
    a.city,
    a.subregion,
    a.region,
    a.postalCode,
  ].filter((p): p is string => !!p && p.trim().length > 0);
  return parts.filter((p, i) => p !== parts[i - 1]).join(", ");
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

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 60, gap: 6 },
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

  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 16 },

  label: { fontSize: 13, fontWeight: "600", color: "#444", marginTop: 12 },
  helpText: { fontSize: 12, color: "#888", marginTop: 4, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },

  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  phonePrefix: {
    fontSize: 15,
    color: "#444",
    fontWeight: "600",
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#000",
  },

  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  imageThumbWrap: { position: "relative" },
  imageThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  imageRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#c62828",
    justifyContent: "center",
    alignItems: "center",
  },
  imageRemoveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 16,
  },
  imageAddBtn: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#007aff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
  },
  imageAddText: { color: "#007aff", fontWeight: "700", fontSize: 13 },

  urgencyRow: { flexDirection: "row", gap: 8 },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  urgencyActive: { backgroundColor: "#007aff", borderColor: "#007aff" },
  urgencyText: { fontSize: 14, color: "#333", fontWeight: "600" },
  urgencyTextActive: { color: "#fff" },

  locationBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007aff",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
  },
  locationBtnText: { color: "#007aff", fontSize: 14, fontWeight: "700" },

  locationBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#e7f5e8",
    borderWidth: 1,
    borderColor: "#b5ddb8",
  },
  locationOk: { color: "#1d6b2a", fontWeight: "600", fontSize: 13 },
  locationCoords: { color: "#1d6b2a", fontSize: 11, marginTop: 2 },

  submitBtn: {
    backgroundColor: "#007aff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  successBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#e7f5e8",
    borderWidth: 1,
    borderColor: "#b5ddb8",
  },
  successTitle: { color: "#1d6b2a", fontWeight: "700" },
  successId: { color: "#1d6b2a", fontSize: 12, marginTop: 4 },
  successHint: { color: "#1d6b2a", fontSize: 12, marginTop: 4 },

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
  urgentBadge: {
    backgroundColor: "#ffe5e5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#c62828",
    letterSpacing: 0.5,
  },

  description: { fontSize: 13, color: "#555", marginTop: 2 },
  meta: { fontSize: 12, color: "#999", marginTop: 2 },

  distanceRow: { marginTop: 4 },
  distanceLabel: { fontSize: 11, color: "#888" },

  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f0f7ff",
    alignSelf: "flex-start",
  },
  callIcon: { fontSize: 14 },
  callText: {
    color: "#007aff",
    fontWeight: "700",
    fontSize: 13,
  },

  imageStrip: { flexDirection: "row", gap: 6, marginTop: 6 },
  stripThumb: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: "#eee",
  },

  flagBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  flagText: { color: "#c62828", fontWeight: "600", fontSize: 12 },

  availableBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#1d6b2a",
    alignItems: "center",
  },
  availableBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
