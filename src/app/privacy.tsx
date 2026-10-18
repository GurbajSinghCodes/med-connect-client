import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: 18 October 2026</Text>

      <Text style={styles.h2}>1. Who we are</Text>
      <Text style={styles.p}>
        MedConnect ("we", "our", "us") is a medicine request platform that
        connects patients with nearby pharmacies. This policy explains what
        personal data we collect, how we use it, and the rights you have under
        India's Digital Personal Data Protection Act, 2023 ("DPDP Act").
      </Text>

      <Text style={styles.h2}>2. Information we collect</Text>
      <Text style={styles.p}>For patients and guests:</Text>
      <Text style={styles.li}>
        • Name and phone number you provide with a request
      </Text>
      <Text style={styles.li}>
        • Your device location at the time of submitting a request
      </Text>
      <Text style={styles.li}>
        • Any prescription photo you choose to upload
      </Text>
      <Text style={styles.li}>
        • A randomly generated device identifier stored on your device
      </Text>
      <Text style={styles.li}>
        • Push notification token if you grant permission
      </Text>
      <Text style={styles.li}>
        • History of your requests and their outcomes
      </Text>

      <Text style={styles.p}>For pharmacies:</Text>
      <Text style={styles.li}>• Name, email, phone number</Text>
      <Text style={styles.li}>
        • Shop name, address, and geographic coordinates
      </Text>
      <Text style={styles.li}>• Operating hours and contact details</Text>
      <Text style={styles.li}>
        • Password (stored as a one-way cryptographic hash) or Google account
        identifier
      </Text>
      <Text style={styles.li}>
        • Records of which requests you marked as available
      </Text>

      <Text style={styles.h2}>3. How we use your information</Text>
      <Text style={styles.p}>We use your data only to:</Text>
      <Text style={styles.li}>
        • Notify nearby pharmacies about your medicine request
      </Text>
      <Text style={styles.li}>• Show you pharmacies that have responded</Text>
      <Text style={styles.li}>
        • Send push notifications about your requests and their outcomes
      </Text>
      <Text style={styles.li}>• Verify your email via one-time codes</Text>
      <Text style={styles.li}>• Keep you signed in securely</Text>

      <Text style={styles.h2}>4. Who we share it with</Text>
      <Text style={styles.p}>
        When you submit a request, we share your phone number and approximate
        pickup location with pharmacies notified about your request so they can
        contact you. We use the following service providers who process data on
        our behalf:
      </Text>
      <Text style={styles.li}>• MongoDB Atlas — database hosting</Text>
      <Text style={styles.li}>• ImageKit — prescription image storage</Text>
      <Text style={styles.li}>
        • Firebase Cloud Messaging — push notifications
      </Text>
      <Text style={styles.li}>
        • Resend — email delivery for verification codes
      </Text>
      <Text style={styles.li}>• Railway / Vercel — API and web hosting</Text>
      <Text style={styles.p}>We do not sell your personal data to anyone.</Text>

      <Text style={styles.h2}>5. How long we keep it</Text>
      <Text style={styles.p}>
        Account data is retained while your account is active. If you deactivate
        your account, your data is retained for up to 3 years so you can
        reactivate. After 3 years of inactivity, your data is permanently
        deleted. You may delete your account at any time from the Profile
        screen, which permanently erases your personal data.
      </Text>

      <Text style={styles.h2}>6. Your rights</Text>
      <Text style={styles.p}>Under the DPDP Act you have the right to:</Text>
      <Text style={styles.li}>
        • Access the personal data we hold about you
      </Text>
      <Text style={styles.li}>
        • Correct inaccurate data (editable in Profile)
      </Text>
      <Text style={styles.li}>
        • Request erasure (Delete account from Profile)
      </Text>
      <Text style={styles.li}>
        • Withdraw consent by deactivating or deleting your account
      </Text>

      <Text style={styles.h2}>7. Security</Text>
      <Text style={styles.p}>
        Passwords are hashed with bcrypt. All network traffic between the app
        and our servers is encrypted over HTTPS. Access to production databases
        is restricted to authorized personnel only.
      </Text>

      <Text style={styles.h2}>8. Children</Text>
      <Text style={styles.p}>
        MedConnect is not intended for use by children under 18. We do not
        knowingly collect data from minors.
      </Text>

      <Text style={styles.h2}>9. Contact</Text>
      <Text style={styles.p}>
        For any privacy questions or requests, contact us at
        gurbajsingh098@gmail.com
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
