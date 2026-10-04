import * as Location from "expo-location";
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
import { ApiError } from "../lib/api";

type Mode =
  | "login"
  | "register-choice"
  | "register-patient"
  | "register-pharmacy";

// ---------- Helpers ----------

/**
 * Extracts the 10-digit local Indian mobile number from any input.
 * Handles: "+91 98765 43210", "+919876543210", "919876543210",
 * "09876543210", "98765 43210", "9876543210".
 * Caps at 10 digits.
 */
function extractLocalDigits(input: string): string {
  // Strip a leading "+91 " or "+91" if present
  let s = input.replace(/^\+91\s?/, "");
  let digits = s.replace(/\D/g, "");

  // Pasted "919876543210" → drop the leading "91"
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  // Pasted "09876543210" → drop the leading "0"
  else if (digits.length > 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
}

/**
 * Strict validator: exactly 10 digits, first digit 6-9.
 */
function isValidPhone(local: string): boolean {
  return local.length === 10 && /^[6-9]/.test(local);
}

function isValidCoord(lng: string, lat: string): boolean {
  const nLng = parseFloat(lng);
  const nLat = parseFloat(lat);
  if (Number.isNaN(nLng) || Number.isNaN(nLat)) return false;
  return nLng >= -180 && nLng <= 180 && nLat >= -90 && nLat <= 90;
}

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

  const deduped = parts.filter((p, i) => p !== parts[i - 1]);
  return deduped.join(", ");
}

// ---------- Root ----------

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");

  if (mode === "login") {
    return <LoginForm onRegister={() => setMode("register-choice")} />;
  }

  if (mode === "register-choice") {
    return (
      <RegisterChoice
        onBack={() => setMode("login")}
        onPatient={() => setMode("register-patient")}
        onPharmacy={() => setMode("register-pharmacy")}
      />
    );
  }

  if (mode === "register-patient") {
    return <PatientForm onBack={() => setMode("register-choice")} />;
  }

  return <PharmacyForm onBack={() => setMode("register-choice")} />;
}

// ---------- Login ----------

function LoginForm({ onRegister }: { onRegister: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed";
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your requests</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!busy}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
          placeholderTextColor="#999"
          secureTextEntry
          editable={!busy}
        />

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Log in</Text>
          )}
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={onRegister} disabled={busy}>
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------- Register choice ----------

function RegisterChoice({
  onBack,
  onPatient,
  onPharmacy,
}: {
  onBack: () => void;
  onPatient: () => void;
  onPharmacy: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>What kind of account do you need?</Text>

      <Pressable style={styles.choiceCard} onPress={onPatient}>
        <Text style={styles.choiceTitle}>I need medicine</Text>
        <Text style={styles.choiceHint}>Register as a patient</Text>
      </Pressable>

      <Pressable style={styles.choiceCard} onPress={onPharmacy}>
        <Text style={styles.choiceTitle}>I'm a pharmacy</Text>
        <Text style={styles.choiceHint}>
          Register your shop to receive requests
        </Text>
      </Pressable>

      <Pressable style={styles.linkBtn} onPress={onBack}>
        <Text style={styles.linkText}>Back to login</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------- Patient form ----------

function PatientForm({ onBack }: { onBack: () => void }) {
  const { registerPatient } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      Alert.alert(
        "Missing info",
        "Name, email, password, and phone are required.",
      );
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (!isValidPhone(phone)) {
      Alert.alert(
        "Invalid phone",
        "Enter a valid 10-digit Indian mobile number (starting with 6-9).",
      );
      return;
    }

    setBusy(true);
    try {
      await registerPatient({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone,
        countryCode: "+91",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed";
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
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
        <Text style={styles.title}>Patient account</Text>
        <Text style={styles.subtitle}>
          Create an account to track your requests
        </Text>

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#999"
          editable={!busy}
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!busy}
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor="#999"
          secureTextEntry
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
            maxLength={15}
            editable={!busy}
          />
        </View>

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Create account</Text>
          )}
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={onBack} disabled={busy}>
          <Text style={styles.linkText}>Back</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------- Pharmacy form ----------

function PharmacyForm({ onBack }: { onBack: () => void }) {
  const { registerPharmacy } = useAuth();
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [address, setAddress] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location permission is required to pin your pharmacy.",
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLongitude(pos.coords.longitude.toFixed(6));
      setLatitude(pos.coords.latitude.toFixed(6));

      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (results.length > 0) {
          setAddress(formatAddress(results[0]));
        } else {
          Alert.alert(
            "Address not found",
            "Coordinates were set, but we couldn't resolve an address. Please type it manually.",
          );
        }
      } catch {
        // Geocoding is best-effort; coordinates are what matter
      }
    } catch (err: any) {
      Alert.alert("Location error", err.message || "Could not fetch location");
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !ownerName.trim() ||
      !email.trim() ||
      !password ||
      !phone.trim() ||
      !pharmacyName.trim() ||
      !address.trim()
    ) {
      Alert.alert("Missing info", "All fields marked * are required.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (!isValidPhone(phone)) {
      Alert.alert(
        "Invalid phone",
        "Enter a valid 10-digit Indian mobile number (starting with 6-9).",
      );
      return;
    }
    if (!isValidCoord(longitude, latitude)) {
      Alert.alert(
        "Missing location",
        "Tap 'Use my current location' to pin your pharmacy, or enter coordinates manually.",
      );
      return;
    }

    setBusy(true);
    try {
      await registerPharmacy({
        name: ownerName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone,
        countryCode: "+91",
        pharmacyName: pharmacyName.trim(),
        address: address.trim(),
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed";
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  const hasCoords = isValidCoord(longitude, latitude);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Pharmacy account</Text>
        <Text style={styles.subtitle}>
          Register your shop to receive nearby requests
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

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="owner@example.com"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!busy}
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor="#999"
          secureTextEntry
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
            maxLength={15}
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
          Tap the button below to pin your shop from GPS. The address field will
          be filled automatically — you can edit it after.
        </Text>

        <Pressable
          style={[styles.locationBtn, (busy || locating) && styles.btnDisabled]}
          onPress={handleUseCurrentLocation}
          disabled={busy || locating}
        >
          {locating ? (
            <ActivityIndicator color="#007aff" />
          ) : (
            <Text style={styles.locationBtnText}>
              {hasCoords ? "Update from GPS" : "Use my current location"}
            </Text>
          )}
        </Pressable>

        <View style={styles.coordRow}>
          <View style={styles.coordCol}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="77.2100"
              placeholderTextColor="#999"
              keyboardType="numeric"
              editable={!busy}
            />
          </View>
          <View style={styles.coordCol}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="28.6140"
              placeholderTextColor="#999"
              keyboardType="numeric"
              editable={!busy}
            />
          </View>
        </View>

        {hasCoords && (
          <Text style={styles.coordOk}>
            ✓ Coordinates set: {latitude}, {longitude}
          </Text>
        )}

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

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Register pharmacy</Text>
          )}
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={onBack} disabled={busy}>
          <Text style={styles.linkText}>Back</Text>
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
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#000",
  },

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

  coordRow: { flexDirection: "row", gap: 12 },
  coordCol: { flex: 1 },
  coordOk: { fontSize: 12, color: "#1d6b2a", marginTop: 8, fontWeight: "600" },

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

  choiceCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  choiceTitle: { fontSize: 17, fontWeight: "700" },
  choiceHint: { fontSize: 13, color: "#888", marginTop: 4 },
});
