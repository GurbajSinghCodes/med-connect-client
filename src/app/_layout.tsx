import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <SplashController />
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </AuthProvider>
  );
}

function SplashController() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Auth state is resolved — safe to hide the splash
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  return null;
}
