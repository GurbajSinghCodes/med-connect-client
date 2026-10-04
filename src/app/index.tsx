import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function HomeScreen() {
  const { isLoading, isPharmacy } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isPharmacy) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Incoming Requests</Text>
        <Text style={styles.hint}>Coming in Chunk 6</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Request Medicine</Text>
      <Text style={styles.hint}>Coming in Chunk 6</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  hint: { fontSize: 14, color: "#888" },
});
