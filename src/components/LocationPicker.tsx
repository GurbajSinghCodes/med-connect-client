import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";

interface Props {
  longitude: string;
  latitude: string;
  onChange: (longitude: string, latitude: string) => void;
  onAddressResolved?: (address: string) => void;
}

const DEFAULT_REGION: Region = {
  latitude: 28.614,
  longitude: 77.21,
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

export default function LocationPicker({
  longitude,
  latitude,
  onChange,
  onAddressResolved,
}: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedRef = useRef<string>("");

  const hasCoords =
    longitude !== "" &&
    latitude !== "" &&
    !isNaN(parseFloat(longitude)) &&
    !isNaN(parseFloat(latitude));

  // ---------- Reverse geocode (debounced) ----------
  const scheduleGeocode = (lng: number, lat: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (key === lastGeocodedRef.current) return;
      lastGeocodedRef.current = key;

      setGeocoding(true);
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        if (results.length > 0 && onAddressResolved) {
          onAddressResolved(formatAddress(results[0]));
        }
      } catch {
        // best-effort
      } finally {
        setGeocoding(false);
      }
    }, 800);
  };

  // ---------- GPS ----------
  const useGps = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Enable location to use GPS.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lng = pos.coords.longitude.toFixed(6);
      const lat = pos.coords.latitude.toFixed(6);
      onChange(lng, lat);
      scheduleGeocode(pos.coords.longitude, pos.coords.latitude);

      if (mapOpen && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    } catch (err: any) {
      Alert.alert("Location error", err.message || "Could not fetch location");
    } finally {
      setLocating(false);
    }
  };

  // ---------- Map ----------
  const toggleMap = () => {
    if (!mapOpen) {
      setMapOpen(true);
      // Wait one frame so MapView mounts, then center on coords if we have them
      setTimeout(() => {
        if (mapRef.current && hasCoords) {
          mapRef.current.animateToRegion({
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        }
      }, 100);
    } else {
      setMapOpen(false);
    }
  };

  const handleRegionChangeComplete = (region: Region) => {
    const lng = region.longitude.toFixed(6);
    const lat = region.latitude.toFixed(6);
    onChange(lng, lat);
    scheduleGeocode(region.longitude, region.latitude);
  };

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, []);

  const initialRegion: Region = hasCoords
    ? {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : DEFAULT_REGION;

  return (
    <View style={styles.wrap}>
      {/* Action buttons */}
      <View style={styles.btnRow}>
        <Pressable
          style={[styles.actionBtn, locating && styles.btnDisabled]}
          onPress={useGps}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#007aff" />
          ) : (
            <Text style={styles.actionBtnText}>Use GPS</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.actionBtn, mapOpen && styles.actionBtnActive]}
          onPress={toggleMap}
        >
          <Text
            style={[
              styles.actionBtnText,
              mapOpen && styles.actionBtnTextActive,
            ]}
          >
            {mapOpen ? "Close map" : "Pick on map"}
          </Text>
        </Pressable>
      </View>

      {/* Current coordinates */}
      {hasCoords ? (
        <View style={styles.coordBox}>
          <Text style={styles.coordOk}>
            ✓ {geocoding ? "Resolving address…" : "Location set"}
          </Text>
          <Text style={styles.coordText}>
            {parseFloat(latitude).toFixed(5)},{" "}
            {parseFloat(longitude).toFixed(5)}
          </Text>
        </View>
      ) : (
        <View style={styles.coordEmpty}>
          <Text style={styles.coordEmptyText}>
            No location set — tap GPS or pick on the map.
          </Text>
        </View>
      )}

      {/* Map */}
      {mapOpen && (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
          />
          {/* Fixed center pin overlay */}
          <View style={styles.pinOverlay} pointerEvents="none">
            <Text style={styles.pinIcon}>📍</Text>
          </View>

          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>Drag the map to move the pin</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function formatAddress(a: Location.LocationGeocodedAddress): string {
  const parts = [
    a.name,
    a.street,
    a.district,
    a.city,
    a.subregion,
    a.region,
    a.postalCode,
  ].filter((p): p is string => !!p && p.trim().length > 0);
  return parts.filter((p, i) => p !== parts[i - 1]).join(", ");
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 8 },

  btnRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007aff",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
  },
  actionBtnActive: { backgroundColor: "#007aff", borderColor: "#007aff" },
  actionBtnText: { color: "#007aff", fontSize: 13, fontWeight: "700" },
  actionBtnTextActive: { color: "#fff" },
  btnDisabled: { opacity: 0.5 },

  coordBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#e7f5e8",
    borderWidth: 1,
    borderColor: "#b5ddb8",
  },
  coordOk: { color: "#1d6b2a", fontWeight: "600", fontSize: 13 },
  coordText: { color: "#1d6b2a", fontSize: 11, marginTop: 2 },

  coordEmpty: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
  },
  coordEmptyText: { color: "#888", fontSize: 12, textAlign: "center" },

  mapWrap: {
    height: 260,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
    position: "relative",
  },
  map: { flex: 1 },
  pinOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -22,
    marginTop: -44,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  pinIcon: { fontSize: 36 },

  mapHint: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  mapHintText: { color: "#fff", fontSize: 11, fontWeight: "600" },
});
