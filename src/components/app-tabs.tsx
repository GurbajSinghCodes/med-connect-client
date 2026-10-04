import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const { isGuest, isPharmacy } = useAuth();

  const icon = require("@/assets/images/tabIcons/home.png");

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>
          {isPharmacy ? "Requests" : "Home"}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={icon} renderingMode="template" />
      </NativeTabs.Trigger>

      {!isPharmacy && (
        <NativeTabs.Trigger name="pharmacies">
          <NativeTabs.Trigger.Label>Pharmacies</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={icon} renderingMode="template" />
        </NativeTabs.Trigger>
      )}

      {!isPharmacy && (
        <NativeTabs.Trigger name="my-requests">
          <NativeTabs.Trigger.Label>My Requests</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={icon} renderingMode="template" />
        </NativeTabs.Trigger>
      )}

      {isPharmacy && (
        <NativeTabs.Trigger name="accepts">
          <NativeTabs.Trigger.Label>Accepts</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={icon} renderingMode="template" />
        </NativeTabs.Trigger>
      )}

      {!isGuest && (
        <NativeTabs.Trigger name="notifications">
          <NativeTabs.Trigger.Label>Alerts</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={icon} renderingMode="template" />
        </NativeTabs.Trigger>
      )}

      {!isGuest && (
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={icon} renderingMode="template" />
        </NativeTabs.Trigger>
      )}

      {isGuest && (
        <NativeTabs.Trigger name="login">
          <NativeTabs.Trigger.Label>Login</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={icon} renderingMode="template" />
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
