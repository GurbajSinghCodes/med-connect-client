import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function TermsOfServiceScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.updated}>Last updated: 18 October 2026</Text>

      <Text style={styles.h2}>1. Acceptance</Text>
      <Text style={styles.p}>
        By using MedConnect, you agree to these terms. If you do not agree,
        please do not use the app.
      </Text>

      <Text style={styles.h2}>2. What MedConnect is</Text>
      <Text style={styles.p}>
        MedConnect is a platform that connects patients seeking medicines with
        pharmacies that may stock them. We are not a pharmacy, we do not sell
        medicines, and we do not provide medical advice. All medicine
        availability information is supplied by pharmacies, not verified by us.
      </Text>

      <Text style={styles.h2}>3. Your responsibilities</Text>
      <Text style={styles.p}>As a user, you agree to:</Text>
      <Text style={styles.li}>• Provide accurate contact information</Text>
      <Text style={styles.li}>
        • Only upload prescription photos you have the right to share
      </Text>
      <Text style={styles.li}>
        • Not use the app to request controlled substances without a valid
        prescription
      </Text>
      <Text style={styles.li}>
        • Not abuse the request system with spam or false requests
      </Text>
      <Text style={styles.li}>
        • Consult a licensed medical professional for any medical decision
      </Text>

      <Text style={styles.p}>As a pharmacy, you agree to:</Text>
      <Text style={styles.li}>• Keep your shop information accurate</Text>
      <Text style={styles.li}>
        • Only mark medicines as available if you genuinely have stock
      </Text>
      <Text style={styles.li}>
        • Comply with all applicable pharmacy regulations in India
      </Text>
      <Text style={styles.li}>
        • Not use the platform to advertise medicines you do not stock
      </Text>

      <Text style={styles.h2}>4. Not medical advice</Text>
      <Text style={styles.p}>
        The app does not provide medical advice. Always consult a licensed
        physician before taking any medicine. Medicine requests submitted via
        the app should follow a valid prescription where legally required.
      </Text>

      <Text style={styles.h2}>5. No guarantee of availability</Text>
      <Text style={styles.p}>
        We do not guarantee that any pharmacy will respond to your request, that
        a pharmacy's stated stock is accurate, or that you will be able to
        obtain any particular medicine. Pharmacy responses are the pharmacy's
        sole responsibility.
      </Text>

      <Text style={styles.h2}>6. Account termination</Text>
      <Text style={styles.p}>
        You may delete your account at any time from the Profile screen. We may
        suspend or terminate accounts that violate these terms, send spam, or
        abuse the request system.
      </Text>

      <Text style={styles.h2}>7. Limitation of liability</Text>
      <Text style={styles.p}>
        MedConnect is provided "as is" without warranties of any kind. To the
        fullest extent permitted by law, we are not liable for any harm arising
        from the use of the app, including but not limited to incorrect stock
        information from pharmacies, medicine quality, or any medical outcome.
      </Text>

      <Text style={styles.h2}>8. Changes to these terms</Text>
      <Text style={styles.p}>
        We may update these terms. Continued use of the app after changes means
        you accept the updated terms.
      </Text>

      <Text style={styles.h2}>9. Governing law</Text>
      <Text style={styles.p}>
        These terms are governed by the laws of India. Disputes will be resolved
        in the courts of Punjab, India.
      </Text>

      <Text style={styles.h2}>10. Contact</Text>
      <Text style={styles.p}>
        Questions about these terms? Email us at support@medconnect.app.
      </Text>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 80,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 6, color: "#0f1419" },
  updated: { fontSize: 12, color: "#888", marginBottom: 24 },
  h2: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
    color: "#0f1419",
  },
  p: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4a5568",
    marginBottom: 8,
  },
  li: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4a5568",
    marginBottom: 4,
    paddingLeft: 8,
  },
  spacer: { height: 40 },
});
