import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api, ApiError, type Request } from "../lib/api";

const POLL_INTERVAL_MS = 10000;

type AlertItem = {
  id: string;
  timestamp: number;
  kind: "submitted" | "responded" | "fulfilled" | "incoming" | "chosen";
  title: string;
  subtitle?: string;
  urgent?: boolean;
  medicineName: string;
};

export default function NotificationsScreen() {
  const { isPharmacy, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      if (isPharmacy) {
        const nearby = await api.getNearbyRequests();
        setItems(buildPharmacyFeed(nearby));
      } else {
        const mine = await api.getMyRequests();
        setItems(buildPatientFeed(mine));
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      setError(msg);
    }
  }, [isPharmacy]);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      await fetchData();
      setLoading(false);
    })();
  }, [authLoading, fetchData]);

  // Poll only while this tab is focused
  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      fetchData();
      const id = setInterval(fetchData, POLL_INTERVAL_MS);
      return () => clearInterval(id);
    }, [authLoading, fetchData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(a) => a.id}
      contentContainerStyle={
        items.length === 0 ? styles.emptyList : styles.list
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            {error ? "Couldn't load alerts" : "No alerts yet"}
          </Text>
          <Text style={styles.emptyHint}>
            {error
              ? error
              : isPharmacy
                ? "You'll see new requests and patient choices here."
                : "You'll see pharmacy responses here as they come in."}
          </Text>
        </View>
      }
      renderItem={({ item }) => <AlertRow item={item} />}
    />
  );
}

// ---------- Feed builders ----------

function buildPatientFeed(requests: Request[]): AlertItem[] {
  const items: AlertItem[] = [];

  for (const r of requests) {
    items.push({
      id: `${r._id}-submitted`,
      timestamp: new Date(r.createdAt).getTime(),
      kind: "submitted",
      title: `You requested ${r.medicineName}`,
      subtitle:
        r.status === "open" ? "Notifying nearby pharmacies…" : undefined,
      urgent: r.urgency === "urgent",
      medicineName: r.medicineName,
    });

    for (const avail of r.availableAt ?? []) {
      const p = avail.pharmacy;
      if (!p) continue;
      items.push({
        id: `${r._id}-avail-${p._id}`,
        timestamp: new Date(avail.markedAt).getTime(),
        kind: "responded",
        title: `${p.name} has ${r.medicineName}`,
        subtitle: p.address,
        medicineName: r.medicineName,
      });
    }

    if (r.status === "fulfilled" && r.fulfilledAt) {
      items.push({
        id: `${r._id}-fulfilled`,
        timestamp: new Date(r.fulfilledAt).getTime(),
        kind: "fulfilled",
        title: `Fulfilled at ${r.fulfilledBy?.name ?? "pharmacy"}`,
        subtitle: r.medicineName,
        medicineName: r.medicineName,
      });
    }
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

function buildPharmacyFeed(requests: Request[]): AlertItem[] {
  const items: AlertItem[] = [];

  for (const r of requests) {
    items.push({
      id: `${r._id}-incoming`,
      timestamp: new Date(r.createdAt).getTime(),
      kind: "incoming",
      title: `New request: ${r.medicineName}`,
      subtitle:
        typeof r.distanceMeters === "number"
          ? `${formatDistance(r.distanceMeters)} away`
          : undefined,
      urgent: r.urgency === "urgent",
      medicineName: r.medicineName,
    });

    if (r.status === "fulfilled" && r.fulfilledAt) {
      items.push({
        id: `${r._id}-chosen`,
        timestamp: new Date(r.fulfilledAt).getTime(),
        kind: "chosen",
        title: `Patient chose you for ${r.medicineName}`,
        subtitle: r.fulfilledBy?.address,
        medicineName: r.medicineName,
      });
    }
  }

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

// ---------- Row ----------

function AlertRow({ item }: { item: AlertItem }) {
  const icon = {
    submitted: "📤",
    responded: "💊",
    fulfilled: "✅",
    incoming: "📥",
    chosen: "🎯",
  }[item.kind];

  const tint = {
    submitted: "#e3f0ff",
    responded: "#fff4d6",
    fulfilled: "#e7f5e8",
    incoming: "#e3f0ff",
    chosen: "#e7f5e8",
  }[item.kind];

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: tint }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.urgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
        </View>

        {item.subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}

        <Text style={styles.rowTime}>{timeAgo(new Date(item.timestamp))}</Text>
      </View>
    </View>
  );
}

// ---------- Helpers ----------

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  list: { padding: 16, paddingTop: 60, gap: 10 },
  emptyList: { flexGrow: 1 },

  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#444" },
  emptyHint: { fontSize: 13, color: "#888", textAlign: "center" },

  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: { fontSize: 20 },

  rowBody: { flex: 1, gap: 2 },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
    flex: 1,
  },
  urgentBadge: {
    backgroundColor: "#ffe5e5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgentText: {
    color: "#c62828",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  rowSubtitle: { fontSize: 12, color: "#666" },
  rowTime: { fontSize: 11, color: "#999", marginTop: 2 },
});
