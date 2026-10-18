import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useGoogleAuth } from "../../lib/googleAuth";
import { authStyles as s } from "./styles";
interface Props {
  onEmailLogin: () => void;
  onOtpRegister: () => void;
}

export default function LandingScreen({ onEmailLogin, onOtpRegister }: Props) {
  const { googleAuth } = useAuth();
  const { request, response, promptAsync } = useGoogleAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setError(err?.message || "Sign-in failed");
        } finally {
          setBusy(false);
        }
      })();
    } else if (response?.type === "error") {
      setError("Google sign-in cancelled");
    }
  }, [response, googleAuth]);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Pharmacy Sign In</Text>
        <Text style={s.pharmacyNotice}>
          This area is for pharmacies only. Patients can request medicines from
          the Home tab without an account.
        </Text>

        {error && (
          <View style={[s.banner, s.bannerError]}>
            <Text style={[s.bannerTitle, s.bannerTitleError]}>
              Sign-in failed
            </Text>
            <Text style={[s.bannerText, s.bannerTextError]}>{error}</Text>
          </View>
        )}

        <Pressable
          style={[
            s.googleBtn,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            },
            (!request || busy) && s.btnDisabled,
          ]}
          onPress={() => {
            setError(null);
            promptAsync();
          }}
          disabled={!request || busy}
        >
          {busy ? (
            <ActivityIndicator color="#333" />
          ) : (
            <>
              <Image
                source={require("../../../assets/images/google.png")}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>OR</Text>
          <View style={s.dividerLine} />
        </View>
        <Pressable style={s.primaryBtn} onPress={onEmailLogin}>
          <Text style={s.primaryText}>Sign in with email</Text>
        </Pressable>

        <Pressable style={s.linkBtn} onPress={onOtpRegister}>
          <Text style={s.linkText}>Create a new account (OTP)</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
