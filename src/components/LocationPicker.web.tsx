// src/components/LocationPicker.web.tsx
import { StyleSheet, Text, TextInput, View } from "react-native";

// This is a simplified web version. It provides a text input for coordinates
// instead of a native map, which is sufficient for most web testing purposes.
export default function LocationPicker({
  longitude,
  latitude,
  onChange,
  onAddressResolved,
}: {
  longitude: string;
  latitude: string;
  onChange: (longitude: string, latitude: string) => void;
  onAddressResolved?: (address: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        On web, please enter coordinates manually.
      </Text>

      <View style={styles.coordRow}>
        <View style={styles.coordCol}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            onChangeText={(v) => {
              onChange(v, latitude);
              // As there's no map, we won't auto-resolve the address.
              if (onAddressResolved) onAddressResolved("");
            }}
            placeholder="77.2100"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.coordCol}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={(v) => {
              onChange(longitude, v);
              if (onAddressResolved) onAddressResolved("");
            }}
            placeholder="28.6140"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 8 },
  hint: {
    fontSize: 12,
    color: "#b45309",
    backgroundColor: "#fef7ed",
    padding: 8,
    borderRadius: 6,
    textAlign: "center",
  },
  coordRow: { flexDirection: "row", gap: 12 },
  coordCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#444", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
});
