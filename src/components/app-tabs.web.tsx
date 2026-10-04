import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { Pressable, StyleSheet, useColorScheme, View } from "react-native";

import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export default function AppTabs() {
  const { isGuest, isPharmacy } = useAuth();

  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>{isPharmacy ? "Requests" : "Home"}</TabButton>
          </TabTrigger>

          {!isPharmacy && (
            <TabTrigger name="pharmacies" href="/pharmacies" asChild>
              <TabButton>Pharmacies</TabButton>
            </TabTrigger>
          )}

          {!isPharmacy && (
            <TabTrigger name="my-requests" href="/my-requests" asChild>
              <TabButton>My Requests</TabButton>
            </TabTrigger>
          )}

          {isPharmacy && (
            <TabTrigger name="accepts" href="/accepts" asChild>
              <TabButton>Accepts</TabButton>
            </TabTrigger>
          )}

          {!isGuest && (
            <TabTrigger name="notifications" href="/notifications" asChild>
              <TabButton>Alerts</TabButton>
            </TabTrigger>
          )}

          {!isGuest && (
            <TabTrigger name="profile" href="/profile" asChild>
              <TabButton>Profile</TabButton>
            </TabTrigger>
          )}

          {isGuest && (
            <TabTrigger name="login" href="/login" asChild>
              <TabButton>Login</TabButton>
            </TabTrigger>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? "backgroundSelected" : "backgroundElement"}
        style={styles.tabButtonView}
      >
        <ThemedText
          type="small"
          themeColor={isFocused ? "text" : "textSecondary"}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          MedConnect
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: "absolute",
    width: "100%",
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: { marginRight: "auto" },
  pressed: { opacity: 0.7 },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
