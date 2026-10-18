import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  separator?: string;
  textColor?: string;
  linkColor?: string;
  fontSize?: number;
}

export default function LegalLinks({
  separator = "·",
  textColor = "#888",
  linkColor = "#007aff",
  fontSize = 12,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.push("/privacy")} hitSlop={6}>
        <Text style={[styles.link, { color: linkColor, fontSize }]}>
          Privacy Policy
        </Text>
      </Pressable>

      <Text style={[styles.sep, { color: textColor, fontSize }]}>
        {separator}
      </Text>

      <Pressable onPress={() => router.push("/terms")} hitSlop={6}>
        <Text style={[styles.link, { color: linkColor, fontSize }]}>
          Terms of Service
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  link: { fontWeight: "600" },
  sep: { fontWeight: "600" },
});
