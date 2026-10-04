import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const { user, isGuest, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    Alert.alert("Logged out");
  };

  if (isGuest) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.hint}>Not logged in</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.line}>Name: {user?.name}</Text>
      <Text style={styles.line}>Email: {user?.email}</Text>
      <Text style={styles.line}>Role: {user?.role}</Text>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  line: { fontSize: 14 },
  hint: { fontSize: 14, color: "#888" },
  logoutBtn: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ff3b30",
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
