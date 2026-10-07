import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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

const C = {
  ink: "#0f1419",
  slate: "#4a5568",
  muted: "#8b95a5",
  mist: "#f7f8fa",
  paper: "#ffffff",
  accent: "#c8372d",
  accentSoft: "#fef2f1",
  signal: "#1a7f5a",
  signalSoft: "#ecfdf5",
  warning: "#b45309",
  warningSoft: "#fef7ed",
  line: "#e5e7eb",
  lineFaint: "#f0f1f3",
};

type Urgency = "general" | "urgent";

export default function HomeScreen() {
  const { isPharmacy, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (isPharmacy) return <IncomingRequests />;
  return <RequestForm />;
}

// ==================== REQUEST FORM ====================

function RequestForm() {
  const { user, setOpenRequestCount } = useAuth();

  const [medicineName, setMedicineName] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("general");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [resetting, setResetting] = useState(false);
  const [coords, setCoords] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [locating, setLocating] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-20)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
  }, [user?.phone]);
  const handleReset = async () => {
    setResetting(true);
    setMedicineName("");
    setDescription("");
    setUrgency("general");
    setImages([]);
    setAddress("");
    setCoords(null);
    setToastVisible(false); // was: setLastRequestId(null)
    if (!user) setPhone("");
    await new Promise((r) => setTimeout(r, 400));
    setResetting(false);
  };
  const showToast = () => {
    setToastVisible(true);
    toastOpacity.setValue(0);
    toastTranslateY.setValue(-20);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setToastVisible(false));
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
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
    const hasName = medicineName.trim().length > 0;
    const hasImage = images.length > 0;

    if (!hasName && !hasImage) {
      Alert.alert(
        "Missing info",
        "Enter a medicine name or upload a prescription photo.",
      );
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

      // Optimistically bump the badge — the request is now open
      setOpenRequestCount((n) => n + 1);

      showToast();
      setMedicineName("");
      setDescription("");
      setUrgency("general");
      setImages([]);
      if (!user) setPhone("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Submission failed";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.flex}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.formScroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={resetting}
              onRefresh={handleReset}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
        >
          <View style={s.heroBlock}>
            <Text style={s.heroKicker}>Request</Text>
            <Text style={s.heroTitle}>What do you need?</Text>
            <Text style={s.heroSub}>
              We'll ping pharmacies near you. First to respond wins your call.
            </Text>
          </View>

          {/* Medicine name */}
          <Text style={s.fieldLabel}>Medicine</Text>
          <TextInput
            style={s.fieldInput}
            value={medicineName}
            onChangeText={setMedicineName}
            placeholder="Insulin, Paracetamol…"
            placeholderTextColor={C.muted}
            editable={!submitting}
          />

          {/* Notes */}
          <Text style={s.fieldLabel}>Notes</Text>
          <TextInput
            style={[s.fieldInput, s.fieldMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Dosage, brand, quantity — anything the pharmacy needs"
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={3}
            editable={!submitting}
          />

          {/* Prescription */}
          <Text style={s.fieldLabel}>Prescription</Text>
          <Text style={s.fieldHint}>
            Photo of a doctor's note works too — name not required if you
            upload.
          </Text>

          <View style={s.imageRow}>
            {images.map((url, i) => (
              <View key={i} style={s.imageThumbWrap}>
                <Image source={{ uri: url }} style={s.imageThumb} />
                <Pressable
                  style={s.imageRemove}
                  onPress={() =>
                    setImages((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  disabled={submitting}
                >
                  <Text style={s.imageRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              style={s.imageAddBtn}
              onPress={handlePickImage}
              disabled={uploading || submitting}
            >
              {uploading ? (
                <ActivityIndicator color={C.accent} />
              ) : (
                <>
                  <Text style={s.imageAddPlus}>+</Text>
                  <Text style={s.imageAddLabel}>Photo</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Urgency segmented control */}
          <Text style={s.fieldLabel}>Priority</Text>
          <View style={s.segment}>
            <Pressable
              style={[
                s.segmentItem,
                urgency === "general" && s.segmentItemActive,
              ]}
              onPress={() => setUrgency("general")}
              disabled={submitting}
            >
              <Text
                style={[
                  s.segmentText,
                  urgency === "general" && s.segmentTextActive,
                ]}
              >
                General
              </Text>
            </Pressable>
            <Pressable
              style={[
                s.segmentItem,
                urgency === "urgent" && s.segmentItemActiveUrgent,
              ]}
              onPress={() => setUrgency("urgent")}
              disabled={submitting}
            >
              <Text
                style={[
                  s.segmentText,
                  urgency === "urgent" && s.segmentTextActive,
                ]}
              >
                Urgent
              </Text>
            </Pressable>
          </View>

          {/* Phone */}
          <Text style={s.fieldLabel}>Your phone *</Text>
          <View style={s.phoneField}>
            <Text style={s.phonePrefix}>+91</Text>
            <View style={s.phoneDivider} />
            <TextInput
              style={s.phoneInput}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
              placeholder="98765 43210"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!submitting}
            />
          </View>
          <Text style={s.fieldHint}>
            Pharmacies will call this number if they have your medicine.
          </Text>

          {/* Location */}
          <Text style={s.fieldLabel}>Pickup location</Text>
          <Pressable
            style={[s.locationBtn, (submitting || locating) && s.btnDisabled]}
            onPress={handleUseLocation}
            disabled={submitting || locating}
          >
            {locating ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <>
                <Text style={s.locationIcon}>◎</Text>
                <Text style={s.locationText}>
                  {coords ? "Location set" : "Use my current location"}
                </Text>
              </>
            )}
          </Pressable>

          {coords && (
            <View style={s.locationCard}>
              <Text style={s.locationCardLabel}>Confirmed</Text>
              <Text style={s.locationCardAddress} numberOfLines={2}>
                {address || "Current location"}
              </Text>
              <Text style={s.locationCardCoords}>
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </Text>
            </View>
          )}

          <Pressable
            style={[s.submitBtn, (submitting || !coords) && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !coords}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.submitText}>Send request</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {toastVisible && (
        <Animated.View
          style={[
            s.toast,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={s.toastIcon}>✓</Text>
          <View style={s.toastTextWrap}>
            <Text style={s.toastTitle}>Request sent</Text>
            <Text style={s.toastSub}>Pharmacies nearby are being notified</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ==================== PHARMACY SIDE ====================

function IncomingRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const { setOpenRequestCount } = useAuth();
  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const list = await api.getNearbyRequests();
      const open = list.filter((r) => r.status === "open");
      setRequests(open);
      setOpenRequestCount(open.length);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      setError(msg);
    }
  }, [setOpenRequestCount]);

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
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Action failed";
      Alert.alert("Error", msg);
    } finally {
      setActingOn(null);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const openCount = requests.length;

  return (
    <FlatList
      data={requests}
      keyExtractor={(r) => r._id}
      contentContainerStyle={requests.length === 0 ? s.emptyList : s.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C.accent}
        />
      }
      ListHeaderComponent={
        openCount > 0 ? (
          <View style={s.listHeader}>
            <Text style={s.listHeaderCount}>{openCount}</Text>
            <Text style={s.listHeaderLabel}>
              open {openCount === 1 ? "request" : "requests"} nearby
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={s.emptyState}>
          <Text style={s.emptyKicker}>All clear</Text>
          <Text style={s.emptyTitle}>No open requests</Text>
          <Text style={s.emptyHint}>
            {error
              ? error
              : "New requests near your shop will show up here automatically."}
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

  const isUrgent = request.urgency === "urgent";
  const hasImages =
    !!request.prescriptionImages && request.prescriptionImages.length > 0;

  return (
    <View style={[s.requestCard, isUrgent && s.requestCardUrgent]}>
      {isUrgent && (
        <View style={s.urgentStripe}>
          <Text style={s.urgentStripeText}>URGENT</Text>
        </View>
      )}

      <View style={s.requestCardBody}>
        <Text style={s.requestTitle}>
          {request.medicineName || "Prescription photo"}
        </Text>

        {request.description ? (
          <Text style={s.requestDesc} numberOfLines={3}>
            {request.description}
          </Text>
        ) : null}

        <View style={s.metaRow}>
          <Text style={s.metaChip}>
            {typeof request.distanceMeters === "number"
              ? formatDistance(request.distanceMeters)
              : "nearby"}
          </Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaChip}>{timeAgo(request.createdAt)}</Text>
        </View>

        {hasImages && (
          <View style={s.thumbStrip}>
            {request.prescriptionImages!.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={s.thumb} />
            ))}
          </View>
        )}

        {request.contactPhone && (
          <Pressable
            style={s.contactRow}
            onPress={() =>
              Linking.openURL(
                `tel:${request.contactCountryCode || "+91"}${request.contactPhone}`,
              )
            }
          >
            <Text style={s.contactIcon}>☎</Text>
            <Text style={s.contactNumber}>
              {request.contactCountryCode || "+91"} {request.contactPhone}
            </Text>
            <Text style={s.contactCta}>Call</Text>
          </Pressable>
        )}

        <View style={s.cardActions}>
          <Pressable
            style={[s.primaryAction, busy && s.btnDisabled]}
            onPress={onAvailable}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryActionText}>I have this</Text>
            )}
          </Pressable>

          {hasImages && (
            <Pressable
              style={[s.secondaryAction, busy && s.btnDisabled]}
              onPress={handleFlag}
              disabled={busy}
            >
              <Text style={s.secondaryActionText}>Flag</Text>
            </Pressable>
          )}
        </View>
      </View>
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
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.mist },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: C.mist,
  },

  // ---- Request form ----
  formScroll: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 40,
  },

  heroBlock: { marginBottom: 20 },
  heroKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: C.accent,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  heroSub: {
    fontSize: 14,
    color: C.slate,
    marginTop: 6,
    lineHeight: 20,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: C.slate,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  fieldInput: {
    backgroundColor: C.paper,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
    borderWidth: 1.5,
    borderColor: C.line,
  },
  fieldMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
    paddingTop: 12,
  },

  // Image picker — full-width, tappable, clearly readable
  imageRow: {
    gap: 10,
    marginTop: 4,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  imageThumbWrap: {
    position: "relative",
    width: 140,
    height: 140,
  },
  imageThumb: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: C.lineFaint,
  },
  imageRemove: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: C.mist,
  },
  imageRemoveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 18,
  },
  imageAddBtn: {
    width: "100%",
    height: 96,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: C.line,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.paper,
    gap: 4,
    flexDirection: "row",
  },
  imageAddPlus: {
    fontSize: 24,
    color: C.slate,
    fontWeight: "400",
    lineHeight: 26,
    marginRight: 6,
  },
  imageAddLabel: {
    fontSize: 14,
    color: C.slate,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  imageCountPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.signalSoft,
  },
  imageCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.signal,
    letterSpacing: 0.3,
  },

  // Segmented control
  segment: {
    flexDirection: "row",
    backgroundColor: C.lineFaint,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: C.paper,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentItemActiveUrgent: {
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.slate,
  },
  segmentTextActive: { color: C.ink },

  // Phone
  phoneField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.paper,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    paddingHorizontal: 14,
    height: 46,
  },
  phonePrefix: {
    fontSize: 15,
    color: C.slate,
    fontWeight: "700",
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: C.line,
    marginHorizontal: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: C.ink,
    height: "100%",
  },

  // Location
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.paper,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    paddingVertical: 14,
  },
  locationIcon: { fontSize: 16, color: C.accent },
  locationText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.ink,
  },
  locationCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.signalSoft,
    borderWidth: 1.5,
    borderColor: "#a7e3c7",
  },
  locationCardLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: C.signal,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  locationCardAddress: {
    fontSize: 14,
    color: C.ink,
    fontWeight: "600",
    lineHeight: 19,
  },
  locationCardCoords: {
    fontSize: 11,
    color: C.signal,
    marginTop: 3,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Submit
  submitBtn: {
    backgroundColor: C.accent,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.4 },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  successCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.signalSoft,
    borderWidth: 1.5,
    borderColor: "#a7e3c7",
  },
  successKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: C.signal,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.2,
  },
  successId: {
    fontSize: 12,
    color: C.signal,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
  },
  successHint: {
    fontSize: 12,
    color: C.signal,
    marginTop: 6,
    lineHeight: 17,
  },

  // ---- Pharmacy list ----
  list: { padding: 16, paddingTop: 48, paddingBottom: 40, gap: 12 },
  emptyList: { flexGrow: 1, backgroundColor: C.mist },

  listHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 14,
  },
  listHeaderCount: {
    fontSize: 32,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.8,
  },
  listHeaderLabel: {
    fontSize: 13,
    color: C.slate,
    fontWeight: "600",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: C.signal,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.4,
  },
  emptyHint: {
    fontSize: 13,
    color: C.slate,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 260,
  },

  // Request card
  requestCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  requestCardUrgent: {
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  urgentStripe: {
    backgroundColor: C.accent,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  urgentStripeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: "#fff",
  },
  requestCardBody: { padding: 14 },

  requestTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  requestDesc: {
    fontSize: 13,
    color: C.slate,
    marginTop: 4,
    lineHeight: 19,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  metaChip: {
    fontSize: 11,
    fontWeight: "700",
    color: C.slate,
    letterSpacing: 0.2,
  },
  metaDot: { color: C.muted, fontSize: 13 },

  // Pharmacy-side prescription previews
  thumbStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  thumb: {
    width: 108,
    height: 108,
    borderRadius: 12,
    backgroundColor: C.lineFaint,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.lineFaint,
  },
  contactIcon: { fontSize: 13, color: C.ink },
  contactNumber: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: C.ink,
  },
  contactCta: {
    fontSize: 11,
    fontWeight: "800",
    color: C.accent,
    letterSpacing: 0.4,
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  primaryAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: C.signal,
    alignItems: "center",
    shadowColor: C.signal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  secondaryAction: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 11,
    backgroundColor: C.paper,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.slate,
  },
  toast: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: C.signal,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  toastIcon: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "800",
  },
  toastTextWrap: { flex: 1, gap: 2 },
  toastTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
  toastSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
});
