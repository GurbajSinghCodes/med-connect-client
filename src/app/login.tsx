import { useState } from "react";
import EmailLoginForm from "../components/auth/EmailLoginForm";
import LandingScreen from "../components/auth/LandingScreen";
import OtpRegisterForm from "../components/auth/OtpRegisterForm";

type Mode = "landing" | "email-login" | "otp-register";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("landing");
  const [prefillEmail, setPrefillEmail] = useState("");

  const goToEmailLogin = (email?: string) => {
    setPrefillEmail(email ?? "");
    setMode("email-login");
  };

  if (mode === "email-login") {
    return (
      <EmailLoginForm
        onBack={() => setMode("landing")}
        initialEmail={prefillEmail}
      />
    );
  }

  if (mode === "otp-register") {
    return (
      <OtpRegisterForm
        onBack={() => setMode("landing")}
        onAccountExists={goToEmailLogin}
      />
    );
  }

  return (
    <LandingScreen
      onEmailLogin={() => goToEmailLogin()}
      onOtpRegister={() => setMode("otp-register")}
    />
  );
}
