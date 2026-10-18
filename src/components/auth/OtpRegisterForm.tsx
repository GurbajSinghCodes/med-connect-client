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
import { useGoogleAuth } from "../../lib/googleAuth";
import { authStyles as s } from "./styles";

interface Props {
  onBack: () => void;
  onAccountExists: (email: string) => void;
}

function extractLocalDigits(input: string): string {
  let str = input.replace(/^\+91\s?/, "");
  let digits = str.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length > 10 && digits.startsWith("0"))
    digits = digits.slice(1);
  return digits.slice(0, 10);
}

function isValidPhone(local: string): boolean {
  return local.length === 10 && /^[6-9]/.test(local);
}

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

interface AccountExists {
  email: string;
  canUseGoogle: boolean;
  canUsePassword: boolean;
  code: string;
  message: string;
}

export default function OtpRegisterForm({ onBack, onAccountExists }: Props) {
  const { requestOtp, verifyOtp, googleAuth } = useAuth();
  const { cooldown, start: startCooldown } = useResendCooldown();

  // Google auth used when account exists with Google-only
  const {
    request: googleRequest,
    response: googleResponse,
    promptAsync,
  } = useGoogleAuth();

  const [stage, setStage] = useState<"email" | "details">("email");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const [accountExists, setAccountExists] = useState<AccountExists | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // When Google sign-in completes from this screen, log in and let
  // the layout swap to the completion form / tabs
  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params?.id_token;
      if (!idToken) return;

      setGoogleBusy(true);
      setError(null);
      (async () => {
        try {
          await googleAuth({ idToken });
        } catch (err: any) {
          setError(err?.message || "Google sign-in failed");
        } finally {
          setGoogleBusy(false);
        }
      })();
    } else if (googleResponse?.type === "error") {
      setError("Google sign-in cancelled");
    }
  }, [googleResponse, googleAuth]);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
    setAccountExists(null);
  };

  const handleAccountExistsResponse = (err: any, attemptedEmail: string) => {
    // ApiError carries a code we set on the backend
    const code = err?.code || "ACCOUNT_HAS_PASSWORD";
    const message = err?.message || "This email is already registered.";

    setAccountExists({
      email: attemptedEmail,
      canUseGoogle:
        code === "ACCOUNT_GOOGLE_ONLY" || code === "ACCOUNT_HAS_PASSWORD",
      canUsePassword: code !== "ACCOUNT_GOOGLE_ONLY",
      code,
      message,
    });
  };

  const sendCode = async () => {
    resetMessages();
    const trimmed = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setSending(true);
    try {
      await requestOtp(trimmed, "verification");
      setStage("details");
      startCooldown();
      setInfo("Code sent. Check your inbox.");
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("already registered") || err?.status === 409) {
        handleAccountExistsResponse(err, trimmed);
      } else {
        setError(err?.message || "Couldn't send code");
      }
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    resetMessages();
    try {
      await requestOtp(email.trim().toLowerCase(), "verification");
      startCooldown();
      setInfo("Code resent.");
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("already registered") || err?.status === 409) {
        handleAccountExistsResponse(err, email.trim().toLowerCase());
      } else {
        setError(err?.message || "Couldn't resend");
      }
    }
  };

  const verify = async () => {
    resetMessages();

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await verifyOtp({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        purpose: "verification",
        name: name.trim(),
        phone,
        countryCode: "+91",
        password,
      });
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("already registered") || err?.status === 409) {
        handleAccountExistsResponse(err, email.trim().toLowerCase());
      } else {
        setError(err?.message || "Verification failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const renderAccountExistsBanner = () => {
    if (!accountExists) return null;

    return (
      <View style={[s.banner, s.bannerWarning]}>
        <Text style={[s.bannerTitle, s.bannerTitleWarning]}>
          Account already exists
        </Text>
        <Text style={[s.bannerText, s.bannerTextWarning]}>
          {accountExists.message}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          {accountExists.canUseGoogle && (
            <Pressable
              style={[
                s.bannerActionBtn,
                s.bannerActionBtnWarning,
                (!googleRequest || googleBusy) && s.btnDisabled,
              ]}
              onPress={() => {
                resetMessages();
                promptAsync();
              }}
              disabled={!googleRequest || googleBusy}
            >
              {googleBusy ? (
                <ActivityIndicator color="#b45309" />
              ) : (
                <Text style={[s.bannerActionText, s.bannerActionTextWarning]}>
                  Continue with Google
                </Text>
              )}
            </Pressable>
          )}

          {accountExists.canUsePassword && (
            <Pressable
              style={[s.bannerActionBtn, s.bannerActionBtnWarning]}
              onPress={() => onAccountExists(accountExists.email)}
            >
              <Text style={[s.bannerActionText, s.bannerActionTextWarning]}>
                Sign in with email
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (stage === "email") {
    return (
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.title}>Create pharmacy account</Text>
          <Text style={s.subtitle}>
            We'll email you a code to verify your email
          </Text>

          {renderAccountExistsBanner()}

          {error && (
            <View style={[s.banner, s.bannerError]}>
              <Text style={[s.bannerTitle, s.bannerTitleError]}>Error</Text>
              <Text style={[s.bannerText, s.bannerTextError]}>{error}</Text>
            </View>
          )}

          <Text style={s.label}>Pharmacy email *</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (accountExists) setAccountExists(null);
              if (error) setError(null);
            }}
            placeholder="owner@pharmacy.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!sending}
          />

          <Pressable
            style={[s.primaryBtn, sending && s.btnDisabled]}
            onPress={sendCode}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryText}>Send code</Text>
            )}
          </Pressable>

          <Pressable style={s.linkBtn} onPress={onBack} disabled={sending}>
            <Text style={s.linkText}>Back</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Verify your email</Text>
        <Text style={s.subtitle}>We sent a code to {email}.</Text>

        {renderAccountExistsBanner()}

        {error && (
          <View style={[s.banner, s.bannerError]}>
            <Text style={[s.bannerTitle, s.bannerTitleError]}>Error</Text>
            <Text style={[s.bannerText, s.bannerTextError]}>{error}</Text>
          </View>
        )}

        {info && (
          <View style={[s.banner, s.bannerSuccess]}>
            <Text style={[s.bannerText, s.bannerTextSuccess]}>{info}</Text>
          </View>
        )}

        <Text style={s.label}>Verification code *</Text>
        <TextInput
          style={[s.input, s.codeInput]}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          placeholderTextColor="#999"
          keyboardType="number-pad"
          maxLength={6}
          editable={!busy}
        />

        <Pressable
          style={s.resendBtn}
          onPress={resend}
          disabled={cooldown > 0 || busy}
        >
          <Text style={s.resendText}>
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Didn't get it? Resend code"}
          </Text>
        </Pressable>

        <Text style={s.label}>Your name *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor="#999"
          editable={!busy}
        />

        <Text style={s.label}>Phone *</Text>
        <View style={s.phoneContainer}>
          <Text style={s.phonePrefix}>+91</Text>
          <TextInput
            style={s.phoneInput}
            value={phone}
            onChangeText={(t) => setPhone(extractLocalDigits(t))}
            placeholder="98765 43210"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            maxLength={10}
            editable={!busy}
          />
        </View>

        <Text style={s.label}>Password *</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Min 6 characters"
          placeholderTextColor="#999"
          secureTextEntry
          editable={!busy}
        />

        <Text style={s.label}>Confirm password *</Text>
        <TextInput
          style={s.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat password"
          placeholderTextColor="#999"
          secureTextEntry
          editable={!busy}
        />

        <Pressable
          style={[s.primaryBtn, busy && s.btnDisabled]}
          onPress={verify}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryText}>Verify & continue</Text>
          )}
        </Pressable>

        <Pressable
          style={s.linkBtn}
          onPress={() => {
            resetMessages();
            setStage("email");
          }}
          disabled={busy}
        >
          <Text style={s.linkText}>Change email</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
