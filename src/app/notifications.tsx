import { StyleSheet, Text, View } from "react-native";

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.hint}>Coming in Chunk 9</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 22, fontWeight: "700" },
  hint: { fontSize: 14, color: "#888" },
});
