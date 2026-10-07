import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

const COLORS = {
  inactive: "#9aa0a6",
  barBg: "#ffffff",
  border: "#e8e8e8",
};

const TAB_COLORS = {
  home: "#007aff",
  pharmacies: "#e91e63",
  requests: "#ff9800",
  accepts: "#4caf50",
  alerts: "#9c27b0",
  profile: "#009688",
  login: "#3f51b5",
};

export default function AppTabs() {
  const { isGuest, isPharmacy, isLoading } = useAuth();
  const router = useRouter();

  // Role key — changes when the visible tab set changes.
  // Used both to force a navigator remount AND to detect role changes.
  const roleKey = isLoading
    ? "loading"
    : isPharmacy
      ? "pharmacy"
      : isGuest
        ? "guest"
        : "patient";

  const prevRoleRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // First time we know the role — just record it, don't redirect
    if (prevRoleRef.current === null) {
      prevRoleRef.current = roleKey;
      return;
    }

    // Role actually changed — bounce to a tab that exists in the new set
    if (prevRoleRef.current !== roleKey) {
      prevRoleRef.current = roleKey;
      router.replace("/");
    }
  }, [roleKey, isLoading, router]);

  return (
    <Tabs
      key={roleKey}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_COLORS.home,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.barBg,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isPharmacy ? "Requests" : "Home",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={
                isPharmacy
                  ? focused
                    ? "list"
                    : "list-outline"
                  : focused
                    ? "home"
                    : "home-outline"
              }
              size={focused ? size + 2 : size}
              color={focused ? TAB_COLORS.home : COLORS.inactive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="pharmacies"
        options={{
          title: "Pharmacies",
          href: isPharmacy ? null : "/pharmacies",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "medkit" : "medkit-outline"}
              size={focused ? size + 2 : size}
              color={focused ? TAB_COLORS.pharmacies : COLORS.inactive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my-requests"
        options={{
          title: "My Requests",
          href: isPharmacy ? null : "/my-requests",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "document-text" : "document-text-outline"}
              size={focused ? size + 2 : size}
              color={focused ? TAB_COLORS.requests : COLORS.inactive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="accepts"
        options={{
          title: "Accepts",
          href: isPharmacy ? "/accepts" : null,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "checkmark-circle" : "checkmark-circle-outline"}
              size={focused ? size + 2 : size}
              color={focused ? TAB_COLORS.accepts : COLORS.inactive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          href: isGuest ? null : "/notifications",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={focused ? size + 2 : size}
              color={focused ? TAB_COLORS.alerts : COLORS.inactive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: isGuest ? null : "/profile",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={focused ? size + 2 : size}
              color={focused ? TAB_COLORS.profile : COLORS.inactive}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="login"
        options={{
          title: "Login",
          href: isGuest ? "/login" : null,
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? "log-in" : "log-in-outline"}
              size={focused ? size + 2 : size}
              color={focused ? TAB_COLORS.login : COLORS.inactive}
            />
          ),
        }}
      />
    </Tabs>
  );
}
