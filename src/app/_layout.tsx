import NotificationHandler from "@/components/NotificationHandler";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <SplashController />
          <NotificationHandler />
          <WebFrame>
            <AnimatedSplashOverlay />
            <AppTabs />
          </WebFrame>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function SplashController() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  return null;
}

function WebFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <View style={styles.webOuter}>
      <View style={styles.webInner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: "#f4f5f7",
    alignItems: "center",
    justifyContent: "center",
  },
  webInner: {
    flex: 1,
    width: "100%",
    maxWidth: 1960,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    overflow: "hidden",
  },
});
