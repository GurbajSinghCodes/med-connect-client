import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import LocationPicker from "./LocationPicker";

function extractLocalDigits(input: string): string {
  let s = input.replace(/^\+91\s?/, "");
  let digits = s.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length > 10 && digits.startsWith("0"))
    digits = digits.slice(1);
  return digits.slice(0, 10);
}

function isValidPhone(local: string): boolean {
  return local.length === 10 && /^[6-9]/.test(local);
}

function isValidCoord(lng: string, lat: string): boolean {
  const nLng = parseFloat(lng);
  const nLat = parseFloat(lat);
  if (Number.isNaN(nLng) || Number.isNaN(nLat)) return false;
  return nLng >= -180 && nLng <= 180 && nLat >= -90 && nLat <= 90;
}

export default function PharmacyProfileCompletion() {
  const { user, completePharmacyProfile, logout } = useAuth();
  const router = useRouter();

  const [ownerName, setOwnerName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [pharmacyName, setPharmacyName] = useState("");
  const [address, setAddress] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorText(null);

    console.log("[completion] submit clicked", {
      ownerName,
      phone,
      pharmacyName,
      address,
      longitude,
      latitude,
    });

    if (!ownerName.trim() || !pharmacyName.trim() || !address.trim()) {
      const msg = "Owner name, pharmacy name, and address are required.";
      console.warn("[completion] validation:", msg);
      setErrorText(msg);
      return;
    }
    if (!isValidPhone(phone)) {
      const msg = "Enter a valid 10-digit mobile number.";
      console.warn("[completion] validation:", msg);
      setErrorText(msg);
      return;
    }
    if (!isValidCoord(longitude, latitude)) {
      const msg = "Pin your pharmacy location first.";
      console.warn("[completion] validation:", msg);
      setErrorText(msg);
      return;
    }

    setBusy(true);
    try {
      await completePharmacyProfile({
        ownerName: ownerName.trim(),
        phone,
        pharmacyName: pharmacyName.trim(),
        address: address.trim(),
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
      });
      console.log("[completion] completePharmacyProfile returned ok");
      router.replace("/");
    } catch (err: any) {
      console.error("[completion] completePharmacyProfile threw:", {
        message: err?.message,
        status: err?.status,
        name: err?.name,
      });
      setErrorText(
        err?.message || "Failed to complete profile. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel setup?",
      "You'll need to sign in again to complete your pharmacy profile.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await logout();
            setTimeout(() => router.replace("/"), 50);
          },
        },
      ],
    );
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
        <Text style={styles.title}>Complete your pharmacy profile</Text>
        <Text style={styles.subtitle}>
          One last step to activate your shop. This is required once.
        </Text>

        <Text style={styles.sectionHeader}>Owner</Text>

        <Text style={styles.label}>Your name *</Text>
        <TextInput
          style={styles.input}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="Owner name"
          placeholderTextColor="#999"
          editable={!busy}
        />

        <Text style={styles.label}>Phone *</Text>
        <View style={styles.phoneContainer}>
          <Text style={styles.phonePrefix}>+91</Text>
          <TextInput
            style={styles.phoneInput}
            value={phone}
            onChangeText={(t) => setPhone(extractLocalDigits(t))}
            placeholder="98765 43210"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            maxLength={10}
            editable={!busy}
          />
        </View>

        <Text style={styles.sectionHeader}>Pharmacy</Text>

        <Text style={styles.label}>Pharmacy name *</Text>
        <TextInput
          style={styles.input}
          value={pharmacyName}
          onChangeText={setPharmacyName}
          placeholder="e.g. City Pharmacy"
          placeholderTextColor="#999"
          editable={!busy}
        />

        <Text style={styles.sectionHeader}>Location *</Text>
        <Text style={styles.helpText}>
          Pin your shop's location. Use GPS if you're there now, or pick on the
          map.
        </Text>
        <LocationPicker
          longitude={longitude}
          latitude={latitude}
          onChange={(lng, lat) => {
            setLongitude(lng);
            setLatitude(lat);
          }}
          onAddressResolved={(addr) => setAddress(addr)}
        />

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={address}
          onChangeText={setAddress}
          placeholder="Street, area, city"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          editable={!busy}
        />

        {errorText && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Complete setup</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkBtn}
          onPress={handleCancel}
          disabled={busy}
        >
          <Text style={styles.linkText}>Cancel and sign out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, paddingTop: 60, gap: 6 },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 4,
  },
  helpText: { fontSize: 12, color: "#888", marginTop: 4, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginTop: 12 },
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
  phoneInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: "#000" },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fef2f1",
    borderWidth: 1,
    borderColor: "#f5b8b3",
  },
  errorText: { fontSize: 13, color: "#8a1f17", lineHeight: 18 },
  primaryBtn: {
    backgroundColor: "#007aff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkText: { color: "#007aff", fontSize: 14, fontWeight: "600" },
});
