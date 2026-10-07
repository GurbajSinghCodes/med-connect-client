import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type Pharmacy } from "../lib/api";

export default function ProfileScreen() {
  const { user, isGuest, isPharmacy, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    Alert.alert("Logged out");
  };

  if (isGuest) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Not logged in</Text>
        <Text style={styles.emptyHint}>
          You're using MedConnect as a guest.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLine}>
          <Text style={styles.infoLabel}>Name: </Text>
          {user?.name}
        </Text>
        <Text style={styles.infoLine}>
          <Text style={styles.infoLabel}>Email: </Text>
          {user?.email}
        </Text>
        <Text style={styles.infoLine}>
          <Text style={styles.infoLabel}>Role: </Text>
          {user?.role}
        </Text>
        {user?.phone && (
          <Text style={styles.infoLine}>
            <Text style={styles.infoLabel}>Phone: </Text>
            {user?.countryCode ?? "+91"} {user?.phone}
          </Text>
        )}
      </View>

      {isPharmacy && <PharmacySettings />}

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ---------- Pharmacy settings ----------

function PharmacySettings() {
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    try {
      const p = await api.getMyPharmacy();
      setPharmacy(p);
      setName(p.name);
      setAddress(p.address);
      setContactNumber(p.contactNumber ?? "");
      setOpeningTime(p.openingTime ?? "09:00");
      setClosingTime(p.closingTime ?? "21:00");
      setIsActive(p.isActive);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert("Missing info", "Name and address are required.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openingTime)) {
      Alert.alert("Invalid opening time", "Use 24-hour format like 09:00");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(closingTime)) {
      Alert.alert("Invalid closing time", "Use 24-hour format like 21:00");
      return;
    }
    if (contactNumber && !/^\d{10}$/.test(contactNumber)) {
      Alert.alert("Invalid contact number", "Enter 10 digits, or leave blank.");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updatePharmacy({
        name: name.trim(),
        address: address.trim(),
        contactNumber: contactNumber.trim(),
        openingTime,
        closingTime,
        isActive,
      });
      setPharmacy(updated);
      Alert.alert("Saved");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.settingsLoading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!pharmacy) {
    return null;
  }

  return (
    <View style={styles.settingsWrap}>
      <Text style={styles.sectionTitle}>Shop settings</Text>

      <View style={styles.activeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>Accepting requests</Text>
          <Text style={styles.switchHint}>
            Turn off to pause notifications when closed.
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          disabled={saving}
        />
      </View>

      <Text style={styles.label}>Pharmacy name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        editable={!saving}
      />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={address}
        onChangeText={setAddress}
        multiline
        numberOfLines={3}
        editable={!saving}
      />

      <Text style={styles.label}>Contact number</Text>
      <View style={styles.phoneContainer}>
        <Text style={styles.phonePrefix}>+91</Text>
        <TextInput
          style={styles.phoneInput}
          value={contactNumber}
          onChangeText={(t) =>
            setContactNumber(t.replace(/\D/g, "").slice(0, 10))
          }
          placeholder="98765 43210"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          maxLength={10}
          editable={!saving}
        />
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.label}>Opens at</Text>
          <TextInput
            style={styles.input}
            value={openingTime}
            onChangeText={setOpeningTime}
            placeholder="09:00"
            placeholderTextColor="#999"
            autoCapitalize="none"
            maxLength={5}
            editable={!saving}
          />
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.label}>Closes at</Text>
          <TextInput
            style={styles.input}
            value={closingTime}
            onChangeText={setClosingTime}
            placeholder="21:00"
            placeholderTextColor="#999"
            autoCapitalize="none"
            maxLength={5}
            editable={!saving}
          />
        </View>
      </View>
      <Text style={styles.hint}>24-hour format, e.g. 09:00 – 21:00</Text>

      <Pressable
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save changes</Text>
        )}
      </Pressable>
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, gap: 8 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#444" },
  emptyHint: { fontSize: 13, color: "#888", textAlign: "center" },

  title: { fontSize: 26, fontWeight: "700", marginBottom: 8 },

  infoCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    gap: 6,
  },
  infoLine: { fontSize: 14, color: "#333" },
  infoLabel: { color: "#888" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },

  settingsWrap: { marginTop: 8 },
  settingsLoading: { paddingVertical: 24, alignItems: "center" },

  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
    gap: 12,
  },
  switchLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  switchHint: { fontSize: 12, color: "#888", marginTop: 2 },

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
  multiline: { minHeight: 70, textAlignVertical: "top" },

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

  timeRow: { flexDirection: "row", gap: 12 },
  timeCol: { flex: 1 },

  hint: { fontSize: 11, color: "#999", marginTop: 6 },

  saveBtn: {
    backgroundColor: "#007aff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.5 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  logoutBtn: {
    marginTop: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ff3b30",
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
