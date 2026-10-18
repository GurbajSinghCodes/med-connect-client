import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface Props {
  longitude: string;
  latitude: string;
  onChange: (longitude: string, latitude: string) => void;
  onAddressResolved?: (address: string) => void;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

export default function LocationPicker({
  longitude,
  latitude,
  onChange,
  onAddressResolved,
}: Props) {
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedRef = useRef<string>("");

  const hasCoords =
    longitude !== "" &&
    latitude !== "" &&
    !isNaN(parseFloat(longitude)) &&
    !isNaN(parseFloat(latitude));

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    setGeocodeError(null);

    try {
      const url = `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data?.error) throw new Error(data.error);

      const address: string | undefined = data?.display_name;

      if (address && address.trim().length > 0) {
        setResolvedAddress(address);
        onAddressResolved?.(address);
      } else {
        setGeocodeError("Address not found for these coordinates");
      }
    } catch (err: any) {
      console.warn("[geocode] failed:", err);
      setGeocodeError(err.message || "Could not resolve address");
    } finally {
      setGeocoding(false);
    }
  };

  const scheduleGeocode = (lat: number, lng: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);

    geocodeTimer.current = setTimeout(() => {
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (key === lastGeocodedRef.current) return;
      lastGeocodedRef.current = key;
      reverseGeocode(lat, lng);
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, []);

  const useGPS = async () => {
    setLocating(true);
    setGeocodeError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location blocked",
          "Your browser blocked location access. Click the location icon in your browser's address bar to allow it, then try again — or enter coordinates manually below.",
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lng = pos.coords.longitude.toFixed(6);
      const lat = pos.coords.latitude.toFixed(6);
      onChange(lng, lat);

      lastGeocodedRef.current = `${pos.coords.latitude.toFixed(
        5,
      )},${pos.coords.longitude.toFixed(5)}`;
      await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        msg.toLowerCase().includes("denied") ||
        msg.toLowerCase().includes("permission")
      ) {
        Alert.alert(
          "Location blocked",
          "Location access was denied. Please enable it in your browser settings and try again.",
        );
      } else {
        Alert.alert("Location error", msg || "Could not get your location.");
      }
    } finally {
      setLocating(false);
    }
  };

  const handleManualChange = (newLng: string, newLat: string) => {
    onChange(newLng, newLat);

    const nLng = parseFloat(newLng);
    const nLat = parseFloat(newLat);

    if (
      !isNaN(nLng) &&
      !isNaN(nLat) &&
      nLng >= -180 &&
      nLng <= 180 &&
      nLat >= -90 &&
      nLat <= 90
    ) {
      scheduleGeocode(nLat, nLng);
    }
  };

  return (
    <View style={styles.wrap}>
      {/* GPS button */}
      <Pressable
        style={[styles.gpsBtn, locating && styles.btnDisabled]}
        onPress={useGPS}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator color="#007aff" />
        ) : (
          <>
            <Text style={styles.gpsIcon}>◎</Text>
            <Text style={styles.gpsText}>
              {hasCoords
                ? "Update from my location"
                : "Use my current location"}
            </Text>
          </>
        )}
      </Pressable>

      {/* Current coordinates */}
      {hasCoords ? (
        <View style={styles.coordBox}>
          <Text style={styles.coordLabel}>Coordinates</Text>
          <Text style={styles.coordValue}>
            {`${parseFloat(latitude).toFixed(5)}, ${parseFloat(
              longitude,
            ).toFixed(5)}`}
          </Text>

          {geocoding ? (
            <View style={styles.geocodingRow}>
              <ActivityIndicator size="small" color="#1a7f5a" />
              <Text style={styles.geocodingText}>Resolving address…</Text>
            </View>
          ) : null}

          {!geocoding && resolvedAddress.length > 0 ? (
            <>
              <Text style={styles.addressLabel}>Address</Text>
              <Text style={styles.addressValue}>{resolvedAddress}</Text>
            </>
          ) : null}

          {!geocoding && resolvedAddress.length === 0 && geocodeError ? (
            <Text style={styles.geocodeError}>{geocodeError}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No location set yet. Tap the button above or enter coordinates
            manually.
          </Text>
        </View>
      )}

      {/* Manual entry */}
      <Text style={styles.manualLabel}>Or enter coordinates manually</Text>
      <View style={styles.coordRow}>
        <View style={styles.coordCol}>
          <Text style={styles.inputLabel}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            onChangeText={(v) => handleManualChange(v, latitude)}
            placeholder="77.2100"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.coordCol}>
          <Text style={styles.inputLabel}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={(v) => handleManualChange(longitude, v)}
            placeholder="28.6140"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.hint}>
        Format is [longitude, latitude]. For India: longitude 68–97, latitude
        8–37.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 10 },

  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#007aff",
    backgroundColor: "#f0f7ff",
  },
  gpsIcon: { fontSize: 16, color: "#007aff" },
  gpsText: { color: "#007aff", fontSize: 14, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },

  coordBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7e3c7",
    gap: 4,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1a7f5a",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  coordValue: {
    fontSize: 13,
    color: "#0f5132",
    fontWeight: "700",
    fontFamily: "monospace",
  },
  geocodingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  geocodingText: { fontSize: 12, color: "#1a7f5a", fontWeight: "600" },

  addressLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1a7f5a",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 8,
  },
  addressValue: {
    fontSize: 13,
    color: "#0f5132",
    lineHeight: 18,
    marginTop: 2,
  },
  geocodeError: {
    fontSize: 12,
    color: "#b45309",
    marginTop: 6,
    fontWeight: "600",
  },

  emptyBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
  },
  emptyText: { color: "#888", fontSize: 12, textAlign: "center" },

  manualLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  coordRow: { flexDirection: "row", gap: 12 },
  coordCol: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#444", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  hint: { fontSize: 11, color: "#999", marginTop: 4, lineHeight: 15 },
});
