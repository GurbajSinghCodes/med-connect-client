import { useRouter } from "expo-router";
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
import LegalLinks from "../components/LegalLinks";
import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type Pharmacy } from "../lib/api";
export default function ProfileScreen() {
  const { user, isGuest, isPharmacy, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setActionError("Name is required.");
      return;
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      setActionError(
        "Enter a valid 10-digit mobile number, or leave it blank.",
      );
      return;
    }

    setActionError(null);
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await api.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      await refreshUser();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: any) {
      setActionError(err?.message || "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeactivate = async () => {
    setActionError(null);
    setDeleting(true);
    try {
      await api.deactivateAccount();
      await logout();
      setConfirmDeactivate(false);
      router.replace("/");
    } catch (err: any) {
      setActionError(err?.message || "Could not deactivate account");
      setDeleting(false);
    }
  };

  const handleDelete = async () => {
    setActionError(null);
    setDeleting(true);
    try {
      await api.deleteAccount();
      await logout();
      setConfirmDelete(false);
      router.replace("/");
    } catch (err: any) {
      setActionError(err?.message || "Could not delete account");
      setDeleting(false);
    }
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

  const hasProfileChanges =
    name.trim() !== (user?.name ?? "") || phone.trim() !== (user?.phone ?? "");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.sectionTitle}>Your details</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor="#999"
        editable={!savingProfile && !deleting}
      />

      <Text style={styles.label}>Email</Text>
      <View style={styles.inputDisabled}>
        <Text style={styles.inputDisabledText}>{user?.email}</Text>
      </View>
      <Text style={styles.hint}>Email cannot be changed.</Text>

      <Text style={styles.label}>Phone</Text>
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
          editable={!savingProfile && !deleting}
        />
      </View>

      {user?.role && (
        <>
          <Text style={styles.label}>Role</Text>
          <View style={styles.inputDisabled}>
            <Text style={styles.inputDisabledText}>{user.role}</Text>
          </View>
        </>
      )}

      {actionError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      )}

      <Pressable
        style={[
          styles.saveBtn,
          (!hasProfileChanges || savingProfile || deleting) &&
            styles.btnDisabled,
        ]}
        onPress={handleSaveProfile}
        disabled={!hasProfileChanges || savingProfile || deleting}
      >
        {savingProfile ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>
            {profileSaved ? "Saved ✓" : "Save changes"}
          </Text>
        )}
      </Pressable>

      {isPharmacy && <PharmacySettings />}

      <Text style={styles.sectionTitle}>Account</Text>

      {!confirmDeactivate ? (
        <Pressable
          style={[styles.deactivateBtn, deleting && styles.btnDisabled]}
          onPress={() => {
            setActionError(null);
            setConfirmDeactivate(true);
          }}
          disabled={deleting}
        >
          <Text style={styles.deactivateText}>Deactivate account</Text>
          <Text style={styles.deactivateHint}>
            Your data is retained. Log in anytime to reactivate.
          </Text>
        </Pressable>
      ) : (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Deactivate your account?</Text>
          <Text style={styles.confirmText}>
            You'll be logged out and won't be able to sign in until you log back
            in. All your data is retained. Per India's DPDP Act, data from
            accounts inactive for 3+ years may be permanently deleted.
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              style={[styles.confirmBtnCancel, deleting && styles.btnDisabled]}
              onPress={() => setConfirmDeactivate(false)}
              disabled={deleting}
            >
              <Text style={styles.confirmBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtnDanger, deleting && styles.btnDisabled]}
              onPress={handleDeactivate}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnDangerText}>Yes, deactivate</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Text style={styles.dangerText}>
          Permanently deletes your profile and all personal data. This cannot be
          undone.
        </Text>

        {!confirmDelete ? (
          <Pressable
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={() => {
              setActionError(null);
              setConfirmDelete(true);
            }}
            disabled={deleting}
          >
            <Text style={styles.deleteBtnText}>Delete account permanently</Text>
          </Pressable>
        ) : (
          <View style={styles.confirmBoxInner}>
            <Text style={styles.confirmTitleDanger}>
              Permanently delete account?
            </Text>
            <Text style={styles.confirmText}>
              This erases your profile and all associated data. This action
              cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={[
                  styles.confirmBtnCancel,
                  deleting && styles.btnDisabled,
                ]}
                onPress={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                <Text style={styles.confirmBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmBtnDanger,
                  deleting && styles.btnDisabled,
                ]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnDangerText}>
                    Delete forever
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
      <Text style={styles.sectionTitle}>Legal</Text>
      <View style={styles.legalLinksBox}>
        <LegalLinks linkColor="#007aff" fontSize={14} />
      </View>

      <Pressable style={styles.logoutBtn} onPress={logout}>
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
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Location state — string values so LocationPicker can bind to them
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");

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

      // Location: [lng, lat]
      if (p.location?.coordinates?.length === 2) {
        const [lng, lat] = p.location.coordinates;
        setLongitude(String(lng));
        setLatitude(String(lat));
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setError(null);

    if (!name.trim() || !address.trim()) {
      setError("Name and address are required.");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openingTime)) {
      setError("Invalid opening time. Use 24-hour format like 09:00");
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(closingTime)) {
      setError("Invalid closing time. Use 24-hour format like 21:00");
      return;
    }
    if (contactNumber && !/^\d{10}$/.test(contactNumber)) {
      setError("Contact number must be 10 digits, or leave it blank.");
      return;
    }

    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    if (
      Number.isNaN(lng) ||
      Number.isNaN(lat) ||
      lng < -180 ||
      lng > 180 ||
      lat < -90 ||
      lat > 90
    ) {
      setError("Set a valid location before saving.");
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
        longitude: lng,
        latitude: lat,
      });
      setPharmacy(updated);
      // Reflect the saved values back
      if (updated.location?.coordinates?.length === 2) {
        setLongitude(String(updated.location.coordinates[0]));
        setLatitude(String(updated.location.coordinates[1]));
      }
      Alert.alert("Saved");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      setError(msg);
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

  if (!pharmacy) return null;

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
            maxLength={5}
            editable={!saving}
          />
        </View>
      </View>
      <Text style={styles.hint}>24-hour format, e.g. 09:00 – 21:00</Text>

      {/* Location section */}
      <Text style={styles.sectionTitle}>Shop location</Text>
      <Text style={styles.hint}>
        Patients near this pin will be matched to your shop. Drag the map or use
        GPS to update.
      </Text>

      <View style={{ marginTop: 8 }}>
        <LocationPicker
          longitude={longitude}
          latitude={latitude}
          onChange={(lng, lat) => {
            setLongitude(lng);
            setLatitude(lat);
          }}
          onAddressResolved={(addr) => {
            if (addr && !address.trim()) setAddress(addr);
          }}
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },

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
  legalLinksBox: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#f7f8fa",
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f7f8fa",
  },
  inputDisabledText: { fontSize: 15, color: "#666" },
  multiline: { minHeight: 70, textAlignVertical: "top" },

  hint: { fontSize: 11, color: "#999", marginTop: 4 },

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

  saveBtn: {
    backgroundColor: "#007aff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.5 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },

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

  timeRow: { flexDirection: "row", gap: 12 },
  timeCol: { flex: 1 },

  deactivateBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 4,
  },
  deactivateText: { fontSize: 15, fontWeight: "700", color: "#333" },
  deactivateHint: { fontSize: 12, color: "#888", lineHeight: 16 },

  confirmBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fef7ed",
    borderWidth: 1,
    borderColor: "#f0d5a8",
    gap: 10,
  },
  confirmBoxInner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fef2f1",
    borderWidth: 1,
    borderColor: "#f5b8b3",
    gap: 8,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#b45309",
    letterSpacing: -0.2,
  },
  confirmTitleDanger: {
    fontSize: 15,
    fontWeight: "800",
    color: "#c8372d",
    letterSpacing: -0.2,
  },
  confirmText: { fontSize: 13, color: "#555", lineHeight: 19 },
  confirmActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  confirmBtnCancel: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  confirmBtnCancelText: { fontSize: 13, fontWeight: "700", color: "#666" },
  confirmBtnDanger: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: "#c8372d",
    alignItems: "center",
  },
  confirmBtnDangerText: { fontSize: 13, fontWeight: "800", color: "#fff" },

  dangerZone: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fef2f1",
    borderWidth: 1,
    borderColor: "#f5b8b3",
    gap: 10,
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#c8372d",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dangerText: { fontSize: 13, color: "#8a1f17", lineHeight: 19 },
  deleteBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#c8372d",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  deleteBtnText: { color: "#c8372d", fontWeight: "800", fontSize: 14 },

  logoutBtn: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ff3b30",
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
