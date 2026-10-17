import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

const SHIMMER_BASE = "#e8eaed";
const SHIMMER_HIGHLIGHT = "#f2f3f5";

/**
 * Animated placeholder bar. Pulses opacity between 0.5 and 1.
 */
export function SkeletonLine({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: SHIMMER_BASE,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * A placeholder card that mimics the shape of a real list item.
 * Composes a title, subtitle, and meta line inside a card.
 */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[s.card, style]}>
      <View style={s.row}>
        <SkeletonLine width="60%" height={18} />
        <SkeletonLine width={54} height={18} radius={10} />
      </View>
      <SkeletonLine width="90%" height={13} style={{ marginTop: 10 }} />
      <SkeletonLine width="70%" height={13} style={{ marginTop: 6 }} />
      <View style={s.actionRow}>
        <SkeletonLine width={100} height={34} radius={8} />
        <SkeletonLine width={100} height={34} radius={8} />
      </View>
    </View>
  );
}

/**
 * A vertical stack of N skeleton cards, spaced like a list.
 */
export function SkeletonList({
  count = 3,
  paddingTop = 60,
}: {
  count?: number;
  paddingTop?: number;
}) {
  return (
    <View style={[s.list, { paddingTop }]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
});
