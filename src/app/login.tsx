import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { useGoogleAuth } from "../lib/googleAuth";

type Mode =
  | "login"
  | "register-choice"
  | "register-patient-otp"
  | "register-pharmacy-otp";

// ---------- Helpers ----------

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
        onPatient={() => setMode("register-patient-otp")}
        onPharmacy={() => setMode("register-pharmacy-otp")}
      />
    );
  }
  if (mode === "register-patient-otp") {
    return <PatientOtpForm onBack={() => setMode("register-choice")} />;
  }
  return <PharmacyOtpForm onBack={() => setMode("register-choice")} />;
}

// ---------- Shared hooks ----------

function useResendCooldown() {
  const [cooldown, setCooldown] = useState(0);
  const start = () => {
    setCooldown(60);
    const t = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };
  return { cooldown, start };
}

// ---------- Login ----------

function LoginForm({ onRegister }: { onRegister: () => void }) {
  const { login, googleAuth } = useAuth();
  const router = useRouter();
  const { request, response, promptAsync } = useGoogleAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Google sign-in — links to any existing account by email
  // Works for users who registered via OTP, password, or Google
  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) return;

      setBusy(true);
      (async () => {
        try {
          await googleAuth({ idToken });
        } catch (err: any) {
          const msg = err?.message || "";
          if (msg.toLowerCase().includes("role must be")) {
            Alert.alert(
              "No account found",
              "We couldn't find an account with that Google email. Please register first.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Register", onPress: onRegister },
              ],
            );
          } else {
            Alert.alert("Error", msg || "Google sign-in failed");
          }
        } finally {
          setBusy(false);
        }
      })();
    } else if (response?.type === "error") {
      Alert.alert("Google sign-in cancelled");
    }
  }, [response, googleAuth, onRegister]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Login failed",
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your requests</Text>

        <Pressable
          style={[styles.googleBtn, (!request || busy) && styles.btnDisabled]}
          onPress={() => promptAsync()}
          disabled={!request || busy}
        >
          {busy ? (
            <ActivityIndicator color="#333" />
          ) : (
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

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

        <Pressable
          style={styles.linkBtn}
          onPress={() => router.push("/forgot-password")}
          disabled={busy}
        >
          <Text style={styles.linkText}>Forgot password?</Text>
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
        <Text style={styles.choiceHint}>
          Continue with Google or email — next step
        </Text>
      </Pressable>

      <Pressable style={styles.choiceCard} onPress={onPharmacy}>
        <Text style={styles.choiceTitle}>I'm a pharmacy</Text>
        <Text style={styles.choiceHint}>
          Continue with Google or email — next step
        </Text>
      </Pressable>

      <Pressable style={styles.linkBtn} onPress={onBack}>
        <Text style={styles.linkText}>Back to login</Text>
      </Pressable>
    </ScrollView>
  );
}

// ---------- Patient OTP form ----------

function PatientOtpForm({ onBack }: { onBack: () => void }) {
  const { requestOtp, verifyOtp, googleAuth } = useAuth();
  const { cooldown, start: startCooldown } = useResendCooldown();
  const {
    request: googleRequest,
    response: googleResponse,
    promptAsync,
  } = useGoogleAuth();

  const [stage, setStage] = useState<"email" | "details">("email");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Google sign-up — patient role, one-tap
  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token;
      if (!idToken) return;

      setBusy(true);
      (async () => {
        try {
          await googleAuth({
            idToken,
            role: "patient",
          });
        } catch (err: any) {
          Alert.alert("Error", err.message || "Google sign-in failed");
        } finally {
          setBusy(false);
        }
      })();
    } else if (googleResponse?.type === "error") {
      Alert.alert("Google sign-in cancelled");
    }
  }, [googleResponse, googleAuth]);

  const sendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      await requestOtp(trimmed, "verification");
      setStage("details");
      startCooldown();
      Alert.alert("Code sent", "Check your inbox for the 6-digit code.");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Couldn't send code",
      );
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      await requestOtp(email.trim().toLowerCase(), "verification");
      startCooldown();
      Alert.alert("Code resent");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Couldn't resend",
      );
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert("Invalid code", "Enter the 6-digit code from your email.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Missing info", "Enter your name.");
      return;
    }
    if (!isValidPhone(phone)) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await verifyOtp({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        purpose: "verification",
        role: "patient",
        name: name.trim(),
        phone,
        countryCode: "+91",
        password,
      });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Verification failed",
      );
    } finally {
      setBusy(false);
    }
  };

  if (stage === "email") {
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
            Sign up with Google for one-tap setup, or use email verification.
          </Text>

          <Pressable
            style={[
              styles.googleBtn,
              (!googleRequest || sending || busy) && styles.btnDisabled,
            ]}
            onPress={() => promptAsync()}
            disabled={!googleRequest || sending || busy}
          >
            {busy ? (
              <ActivityIndicator color="#333" />
            ) : (
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!sending}
          />

          <Pressable
            style={[styles.primaryBtn, sending && styles.btnDisabled]}
            onPress={sendCode}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Send code</Text>
            )}
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={onBack} disabled={sending}>
            <Text style={styles.linkText}>Back</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Verify & finish</Text>
        <Text style={styles.subtitle}>We sent a code to {email}.</Text>

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

        <Pressable
          style={styles.resendBtn}
          onPress={resend}
          disabled={cooldown > 0 || busy}
        >
          <Text style={styles.resendText}>
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Didn't get it? Resend code"}
          </Text>
        </Pressable>

        <Text style={styles.label}>Your name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Full name"
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

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Min 6 characters"
          placeholderTextColor="#999"
          secureTextEntry
          editable={!busy}
        />

        <Text style={styles.label}>Confirm password *</Text>
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
          onPress={verify}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Verify & create account</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkBtn}
          onPress={() => setStage("email")}
          disabled={busy}
        >
          <Text style={styles.linkText}>Change email</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------- Pharmacy OTP form ----------

function PharmacyOtpForm({ onBack }: { onBack: () => void }) {
  const { requestOtp, verifyOtp, googleAuth } = useAuth();
  const { cooldown, start: startCooldown } = useResendCooldown();
  const {
    request: googleRequest,
    response: googleResponse,
    promptAsync,
  } = useGoogleAuth();

  const [stage, setStage] = useState<"email" | "details">("email");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Whether the current flow is using Google (skip OTP) or email OTP
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [address, setAddress] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [busy, setBusy] = useState(false);

  // Google sign-in — store token, jump to details stage
  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token;
      if (!idToken) return;
      setGoogleIdToken(idToken);
      setStage("details");
    } else if (googleResponse?.type === "error") {
      Alert.alert("Google sign-in cancelled");
    }
  }, [googleResponse]);

  const sendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      await requestOtp(trimmed, "verification");
      setStage("details");
      startCooldown();
      Alert.alert("Code sent", "Check your inbox for the 6-digit code.");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Couldn't send code",
      );
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      await requestOtp(email.trim().toLowerCase(), "verification");
      startCooldown();
      Alert.alert("Code resent");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Couldn't resend",
      );
    }
  };

  const submit = async () => {
    if (!ownerName.trim() || !pharmacyName.trim() || !address.trim()) {
      Alert.alert(
        "Missing info",
        "Owner name, pharmacy name, and address are required.",
      );
      return;
    }
    if (!isValidPhone(phone)) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit mobile number.");
      return;
    }
    if (!isValidCoord(longitude, latitude)) {
      Alert.alert("Missing location", "Pin your pharmacy location first.");
      return;
    }

    // Google path — no OTP, no password
    if (googleIdToken) {
      setBusy(true);
      try {
        await googleAuth({
          idToken: googleIdToken,
          role: "pharmacy",
          name: ownerName.trim(),
          phone,
          countryCode: "+91",
          pharmacyName: pharmacyName.trim(),
          address: address.trim(),
          longitude: parseFloat(longitude),
          latitude: parseFloat(latitude),
        });
      } catch (err: any) {
        Alert.alert("Error", err.message || "Google sign-in failed");
      } finally {
        setBusy(false);
      }
      return;
    }

    // Email OTP path
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert("Invalid code", "Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await verifyOtp({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        purpose: "verification",
        role: "pharmacy",
        name: ownerName.trim(),
        phone,
        countryCode: "+91",
        password,
        pharmacyName: pharmacyName.trim(),
        address: address.trim(),
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
      });
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Verification failed",
      );
    } finally {
      setBusy(false);
    }
  };

  if (stage === "email") {
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
            Sign up with Google, or use email verification.
          </Text>

          <Pressable
            style={[
              styles.googleBtn,
              (!googleRequest || sending) && styles.btnDisabled,
            ]}
            onPress={() => promptAsync()}
            disabled={!googleRequest || sending}
          >
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="owner@example.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!sending}
          />

          <Pressable
            style={[styles.primaryBtn, sending && styles.btnDisabled]}
            onPress={sendCode}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Send code</Text>
            )}
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={onBack} disabled={sending}>
            <Text style={styles.linkText}>Back</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          {googleIdToken ? "Complete your pharmacy profile" : "Verify & finish"}
        </Text>
        <Text style={styles.subtitle}>
          {googleIdToken
            ? "We have your Google details. Just add your shop information."
            : `We sent a code to ${email}.`}
        </Text>

        {!googleIdToken && (
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

            <Pressable
              style={styles.resendBtn}
              onPress={resend}
              disabled={cooldown > 0 || busy}
            >
              <Text style={styles.resendText}>
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Didn't get it? Resend code"}
              </Text>
            </Pressable>
          </>
        )}

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

        {!googleIdToken && (
          <>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              placeholderTextColor="#999"
              secureTextEntry
              editable={!busy}
            />

            <Text style={styles.label}>Confirm password *</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              placeholderTextColor="#999"
              secureTextEntry
              editable={!busy}
            />
          </>
        )}

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

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {googleIdToken
                ? "Complete registration"
                : "Verify & create account"}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkBtn}
          onPress={() => {
            setGoogleIdToken(null);
            setStage("email");
          }}
          disabled={busy}
        >
          <Text style={styles.linkText}>
            {googleIdToken ? "Use email instead" : "Change email"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------- Styles ----------

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
  codeInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "700",
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

  resendBtn: { paddingVertical: 10, alignItems: "center" },
  resendText: { color: "#007aff", fontSize: 13, fontWeight: "600" },

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

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    marginBottom: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  dividerText: { fontSize: 12, color: "#999", fontWeight: "700" },
  googleBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#ddd",
    alignItems: "center",
  },
  googleBtnText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 15,
  },
});
