import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../context/SettingsContext';

const PRIVACY_POLICY_TEXT = `
Last Updated: May 2026

1. INFORMATION WE COLLECT

MUA Planner collects and stores the following information that you provide:
• Your name and email address (for account authentication)
• Event details you create (client names, dates, locations, packages)
• Travel arrangements linked to your events
• Team member information you add
• App settings and preferences

2. HOW WE USE YOUR INFORMATION

We use your information to:
• Authenticate your account via OTP verification
• Store and sync your events, travel, and team data
• Send you event reminder notifications (if enabled)
• Improve app functionality and user experience

3. DATA STORAGE & SECURITY

• Your data is stored securely on our servers
• We use HTTPS encryption for all data transmission
• Passwords are never stored; we use OTP-based authentication
• We do not sell or share your personal data with third parties

4. YOUR RIGHTS

You have the right to:
• Access your personal data within the app
• Update or correct your information
• Delete your account and all associated data
• Disable notifications at any time

5. DATA RETENTION

We retain your data as long as your account is active. You can delete all your data at any time through Settings > Clear App Data.

6. THIRD-PARTY SERVICES

We use the following third-party services:
• Email delivery service for OTP verification
• Cloud hosting for data storage

7. CHILDREN'S PRIVACY

MUA Planner is not intended for users under 13 years of age. We do not knowingly collect data from children.

8. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date.

9. CONTACT US

If you have questions about this Privacy Policy or your data, please contact us through the app's feedback feature in Settings > Contact Support.
`.trim();

export default function PrivacyPolicyScreen() {
  const C = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: C.surface }]}>
        <Text style={[styles.policyText, { color: C.text }]}>
          {PRIVACY_POLICY_TEXT}
        </Text>
      </View>
      <Text style={[styles.footer, { color: C.textMuted }]}>
        MUA Planner © 2026
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
});
