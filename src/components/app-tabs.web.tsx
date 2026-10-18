import { Ionicons } from "@expo/vector-icons";
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

const MOBILE_BREAKPOINT = 768;

type IconName = keyof typeof Ionicons.glyphMap;

// Web-only style to guarantee no "..." appears
const webNoEllipsis =
  Platform.OS === "web"
    ? ({
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "clip",
        maxWidth: "100%",
      } as any)
    : undefined;

export default function AppTabs() {
  const { isGuest, isPharmacy } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < MOBILE_BREAKPOINT;

  const Button = isMobile ? MobileTabButton : TabButton;
  const Wrapper = isMobile ? MobileTabList : DesktopTabList;

  // Height of the mobile bottom nav: 62px base + safe area inset
  const mobileNavHeight = 62 + Math.max(insets.bottom, 6);

  return (
    <Tabs>
      <TabSlot
        style={{
          height: "100%",
          paddingBottom: isMobile ? mobileNavHeight : 0,
        }}
      />
      <TabList asChild>
        <Wrapper>
          <TabTrigger name="home" href="/" asChild>
            <Button icon={isPharmacy ? "list" : "home"}>
              {isPharmacy ? "Requests" : "Home"}
            </Button>
          </TabTrigger>

          {!isPharmacy && (
            <TabTrigger name="pharmacies" href="/pharmacies" asChild>
              <Button icon="medkit">Shops</Button>
            </TabTrigger>
          )}

          {!isPharmacy && (
            <TabTrigger name="my-requests" href="/my-requests" asChild>
              <Button icon="document-text">Requests</Button>
            </TabTrigger>
          )}

          {isPharmacy && (
            <TabTrigger name="accepts" href="/accepts" asChild>
              <Button icon="checkmark-circle">Accept</Button>
            </TabTrigger>
          )}

          {!isGuest && (
            <TabTrigger name="notifications" href="/notifications" asChild>
              <Button icon="notifications">Alerts</Button>
            </TabTrigger>
          )}

          {!isGuest && (
            <TabTrigger name="profile" href="/profile" asChild>
              <Button icon="person">Profile</Button>
            </TabTrigger>
          )}

          {isGuest && (
            <TabTrigger name="login" href="/login" asChild>
              <Button icon="log-in">Login</Button>
            </TabTrigger>
          )}

          {/* Hidden routes — direct children of TabList */}
          <TabTrigger name="privacy" href="/privacy" asChild>
            <Pressable style={{ display: "none" }}>
              <Text>Privacy</Text>
            </Pressable>
          </TabTrigger>
          <TabTrigger name="terms" href="/terms" asChild>
            <Pressable style={{ display: "none" }}>
              <Text>Terms</Text>
            </Pressable>
          </TabTrigger>
        </Wrapper>
      </TabList>
    </Tabs>
  );
}

// ---------- Desktop tab list (top nav, unchanged) ----------

export function DesktopTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <View {...props} style={styles.desktopTabListContainer}>
      <ThemedView type="backgroundElement" style={styles.desktopInnerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          MedConnect
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

// ---------- Mobile tab list (bottom nav) ----------

export function MobileTabList(props: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.mobileTabListContainer,
        { paddingBottom: Math.max(insets.bottom, 6) },
      ]}
    >
      <View style={styles.mobileInnerContainer}>{props.children}</View>
    </View>
  );
}

// ---------- Buttons ----------

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

export function MobileTabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon?: IconName }) {
  const color = isFocused ? "#007aff" : "#9aa0a6";
  const iconName: IconName = icon
    ? isFocused
      ? icon
      : (`${icon}-outline` as IconName)
    : "ellipse-outline";

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.mobileTabButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={iconName} size={22} color={color} />
      <View style={styles.mobileLabelWrap}>
        <Text
          style={[styles.mobileTabLabel, { color }, webNoEllipsis]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  // Desktop
  desktopTabListContainer: {
    position: "absolute",
    top: 0,
    width: "100%",
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    zIndex: 10,
  },
  desktopInnerContainer: {
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

  // Mobile
  mobileTabListContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    zIndex: 10,
  },
  mobileInnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 0,
  },
  mobileTabButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 2,
  },
  mobileLabelWrap: {
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
  },
  mobileTabLabel: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.1,
  },

  // Shared
  pressed: { opacity: 0.6 },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
