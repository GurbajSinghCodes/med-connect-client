import { StyleSheet, Text, View } from "react-native";
import LegalLinks from "./LegalLinks";

interface Props {
  action?: string; // e.g. "signing in", "creating an account"
}

export default function AuthConsentNote({ action = "continuing" }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>By {action}, you agree to our</Text>
      <LegalLinks fontSize={12} linkColor="#007aff" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 16,
  },
});
