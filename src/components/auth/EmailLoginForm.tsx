import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import { useGoogleAuth } from "../../lib/googleAuth";
import AuthConsentNote from "../AuthConsentNote";
import { authStyles as s } from "./styles";
interface Props {
  onBack: () => void;
  initialEmail?: string;
}

export default function EmailLoginForm({ onBack, initialEmail }: Props) {
  const { login, googleAuth } = useAuth();
  const { request, response, promptAsync } = useGoogleAuth();
  const router = useRouter();

  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleOnlyEmail, setGoogleOnlyEmail] = useState<string | null>(null);
  const [noPasswordEmail, setNoPasswordEmail] = useState<string | null>(null);

  // Handle Google sign-in when triggered from this screen
  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) return;

      setError(null);
      setBusy(true);
      (async () => {
        try {
          await googleAuth({ idToken });
        } catch (err: any) {
          setError(err?.message || "Google sign-in failed");
        } finally {
          setBusy(false);
        }
      })();
    } else if (response?.type === "error") {
      setError("Google sign-in cancelled");
    }
  }, [response, googleAuth]);

  const resetBanners = () => {
    setError(null);
    setGoogleOnlyEmail(null);
    setNoPasswordEmail(null);
  };

  const handleLogin = async () => {
    resetBanners();
    if (!email.trim() || !password) {
      setError("Enter email and password.");
      return;
    }

    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : "Login failed";
      const code = err instanceof ApiError ? err.code : undefined;

      if (code === "GOOGLE_ONLY_ACCOUNT") {
        setGoogleOnlyEmail(email.trim().toLowerCase());
        setPassword("");
      } else if (code === "NO_PASSWORD_SET") {
        setNoPasswordEmail(email.trim().toLowerCase());
        setPassword("");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Sign in with email</Text>
        <Text style={s.subtitle}>Enter your pharmacy email and password</Text>

        {googleOnlyEmail && (
          <View style={[s.banner, s.bannerWarning]}>
            <Text style={[s.bannerTitle, s.bannerTitleWarning]}>
              This account uses Google sign-in
            </Text>
            <Text style={[s.bannerText, s.bannerTextWarning]}>
              {googleOnlyEmail} was registered with Google, so it has no
              password. Sign in with Google instead.
            </Text>
            <Pressable
              style={[s.bannerActionBtn, s.bannerActionBtnWarning]}
              onPress={() => {
                resetBanners();
                promptAsync();
              }}
              disabled={!request || busy}
            >
              <Text style={[s.bannerActionText, s.bannerActionTextWarning]}>
                Continue with Google
              </Text>
            </Pressable>
          </View>
        )}

        {noPasswordEmail && (
          <View style={[s.banner, s.bannerWarning]}>
            <Text style={[s.bannerTitle, s.bannerTitleWarning]}>
              No password set
            </Text>
            <Text style={[s.bannerText, s.bannerTextWarning]}>
              {noPasswordEmail} doesn't have a password yet. Use "Forgot
              password" below to set one.
            </Text>
            <Pressable
              style={[s.bannerActionBtn, s.bannerActionBtnWarning]}
              onPress={() =>
                router.push({
                  pathname: "/forgot-password",
                  params: { email: noPasswordEmail ?? "" },
                } as any)
              }
            >
              <Text style={[s.bannerActionText, s.bannerActionTextWarning]}>
                Set a password
              </Text>
            </Pressable>
          </View>
        )}

        {error && (
          <View style={[s.banner, s.bannerError]}>
            <Text style={[s.bannerTitle, s.bannerTitleError]}>Error</Text>
            <Text style={[s.bannerText, s.bannerTextError]}>{error}</Text>
          </View>
        )}

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (googleOnlyEmail) setGoogleOnlyEmail(null);
            if (noPasswordEmail) setNoPasswordEmail(null);
            if (error) setError(null);
          }}
          placeholder="owner@pharmacy.com"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!busy}
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
          placeholderTextColor="#999"
          secureTextEntry
          editable={!busy}
        />

        <Pressable
          style={[s.primaryBtn, busy && s.btnDisabled]}
          onPress={handleLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryText}>Log in</Text>
          )}
        </Pressable>

        <Pressable
          style={s.linkBtn}
          onPress={() => router.push("/forgot-password")}
          disabled={busy}
        >
          <Text style={s.linkText}>Forgot password?</Text>
        </Pressable>

        <Pressable style={s.linkBtn} onPress={onBack} disabled={busy}>
          <Text style={s.linkText}>Back</Text>
        </Pressable>
        <AuthConsentNote action="signing in" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
