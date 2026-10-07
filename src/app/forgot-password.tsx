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
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

type Stage = "email" | "reset";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestOtp, resetPassword } = useAuth();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await requestOtp(trimmed, "reset");
      setStage("reset");
      Alert.alert(
        "Code sent",
        "If an account exists for that email, a code is on its way.",
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Couldn't send code",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert("Invalid code", "Enter the 6-digit code from your email.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Weak password", "Minimum 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
      Alert.alert(
        "Password reset",
        "You can now log in with your new password.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Reset failed",
      );
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
        <Text style={styles.title}>
          {stage === "email" ? "Reset password" : "Enter code"}
        </Text>
        <Text style={styles.subtitle}>
          {stage === "email"
            ? "We'll email you a code to reset your password."
            : `We sent a code to ${email}.`}
        </Text>

        {stage === "email" ? (
          <>
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
            <Pressable
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={sendCode}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Send reset code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>Verification code *</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={6}
              editable={!busy}
            />

            <Text style={styles.label}>New password *</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min 6 characters"
              placeholderTextColor="#999"
              secureTextEntry
              editable={!busy}
            />

            <Text style={styles.label}>Confirm new password *</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              placeholderTextColor="#999"
              secureTextEntry
              editable={!busy}
            />

            <Pressable
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={handleReset}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Reset password</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.linkBtn}
              onPress={() => setStage("email")}
              disabled={busy}
            >
              <Text style={styles.linkText}>Change email</Text>
            </Pressable>
          </>
        )}

        <Pressable
          style={styles.linkBtn}
          onPress={() => router.back()}
          disabled={busy}
        >
          <Text style={styles.linkText}>Back to login</Text>
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
  codeInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: "#007aff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkText: { color: "#007aff", fontSize: 14, fontWeight: "600" },
});
