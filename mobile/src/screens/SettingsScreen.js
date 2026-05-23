import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { useSettings, useTheme } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { submitFeedback, clearAllData } from '../api/settings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const THEME_COLORS = [
  { key: 'plum',     color: '#7B2D52', label: 'Plum' },
  { key: 'emerald',  color: '#1B5E20', label: 'Emerald' },
  { key: 'royal',    color: '#0D47A1', label: 'Royal' },
  { key: 'purple',   color: '#4A148C', label: 'Purple' },
  { key: 'sienna',   color: '#BF360C', label: 'Sienna' },
  { key: 'charcoal', color: '#37474F', label: 'Charcoal' },
];

const COLOR_MODES = [
  { key: 'light',  label: 'Light',  icon: 'sunny' },
  { key: 'dark',   label: 'Dark',   icon: 'moon' },
  { key: 'system', label: 'System', icon: 'phone-portrait' },
];

const FONT_SIZES = [
  { key: 'small',  label: 'Small',  demo: 13 },
  { key: 'medium', label: 'Medium', demo: 15 },
  { key: 'large',  label: 'Large',  demo: 17 },
];

const NOTIFY_BEFORE_OPTIONS = [
  { key: '60',   label: '1 hour' },
  { key: '240',  label: '4 hours' },
  { key: '480',  label: '8 hours' },
  { key: '1440', label: '24 hours' },
  { key: '2880', label: '2 days' },
];

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { settings, updateSettings, resetSettings } = useSettings();
  const C = useTheme();

  /* ── Modal states ─────────────────────────── */
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  /* ── Passcode state ───────────────────────── */
  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeStep, setPasscodeStep] = useState('enter'); // enter | confirm | verify
  const [passcodeError, setPasscodeError] = useState('');
  const pinRef = useRef(null);

  /* ── Feedback state ───────────────────────── */
  const [fbSubject, setFbSubject] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbSending, setFbSending] = useState(false);

  /* ── Derived settings ─────────────────────── */
  const themeColor = settings.themeColor || '#7B2D52';
  const colorMode = settings.colorMode || 'light';
  const fontSize = settings.fontSize || 'medium';
  const notificationsEnabled = settings.notificationsEnabled === 'true';
  const notifyBefore = settings.notifyBefore || '60';

  const passcodeLock = settings.passcodeLock === 'true';
  const mapsEnabled = settings.mapsEnabled === 'true';
  const currentFontDemo = FONT_SIZES.find(f => f.key === fontSize)?.demo || 15;

  /* ── Re-focus PIN input on step change ────── */
  useEffect(() => {
    if (showPasscodeModal) {
      setTimeout(() => pinRef.current?.focus(), 200);
    }
  }, [passcodeStep, showPasscodeModal]);

  /* ═══════════════════════════════════════════
     HANDLERS
     ═══════════════════════════════════════════ */

  const handleThemeColor = (color) => updateSettings({ themeColor: color });
  const handleColorMode = (mode) => updateSettings({ colorMode: mode });
  const handleFontSize = (size) => updateSettings({ fontSize: size });
  const handleNotificationsToggle = (val) => updateSettings({ notificationsEnabled: String(val) });
  const handleNotifyBefore = (val) => updateSettings({ notifyBefore: val });

  const handleMapsToggle = (val) => updateSettings({ mapsEnabled: String(val) });

  /* ── Passcode toggle ──────────────────────── */
  const handlePasscodeToggle = (val) => {
    if (val) {
      setPasscodeStep('enter');
      setPasscodeInput('');
      setConfirmPasscode('');
      setPasscodeError('');
      setShowPasscodeModal(true);
    } else {
      setPasscodeStep('verify');
      setPasscodeInput('');
      setPasscodeError('');
      setShowPasscodeModal(true);
    }
  };

  const handlePasscodeSubmit = () => {
    if (passcodeStep === 'enter') {
      if (passcodeInput.length !== 4) {
        setPasscodeError('Enter a 4-digit passcode');
        return;
      }
      setPasscodeStep('confirm');
      setConfirmPasscode('');
      setPasscodeError('');
    } else if (passcodeStep === 'confirm') {
      if (confirmPasscode !== passcodeInput) {
        setPasscodeError('Passcodes do not match');
        setConfirmPasscode('');
        return;
      }
      updateSettings({ passcodeLock: 'true', passcode: passcodeInput });
      setShowPasscodeModal(false);
      setPasscodeInput('');
      setConfirmPasscode('');
    } else if (passcodeStep === 'verify') {
      if (passcodeInput !== settings.passcode) {
        setPasscodeError('Incorrect passcode');
        setPasscodeInput('');
        return;
      }
      updateSettings({ passcodeLock: 'false', passcode: '' });
      setShowPasscodeModal(false);
      setPasscodeInput('');
    }
  };

  /* ── Feedback submit ──────────────────────── */
  const handleSubmitFeedback = async () => {
    if (!fbMessage.trim()) {
      Alert.alert('Required', 'Please enter your message');
      return;
    }
    setFbSending(true);
    try {
      await submitFeedback({ subject: fbSubject.trim(), message: fbMessage.trim() });
      setShowFeedbackModal(false);
      setFbSubject('');
      setFbMessage('');
      Alert.alert('Thank you! 🙏', 'Your feedback has been submitted successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setFbSending(false);
    }
  };

  /* ── Clear data ───────────────────────────── */
  const handleClearData = () => {
    Alert.alert(
      'Clear App Data',
      'This will permanently delete all events, travel records, feedback, and reset all settings to defaults.\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              resetSettings();
              Alert.alert('Done', 'All app data has been cleared and settings reset.');
            } catch (err) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
  };

  /* ── Sign out ─────────────────────────────── */
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  /* ═══════════════════════════════════════════
     REUSABLE SUB-COMPONENTS
     ═══════════════════════════════════════════ */

  const SectionHeader = ({ icon, title, color, first }) => (
    <View style={[styles.sectionHeader, first && { marginTop: 4 }]}>
      <View style={[styles.sectionIcon, { backgroundColor: color || themeColor }]}>
        <Ionicons name={icon} size={16} color="#FFF" />
      </View>
      <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
    </View>
  );

  const SettingRow = ({ label, subtitle, right, onPress, last }) => (
    <TouchableOpacity
      style={[styles.settingRow, last && { borderBottomWidth: 0 }]}
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, { color: C.text }]}>{label}</Text>
        {subtitle ? <Text style={[styles.settingSubtitle, { color: C.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </TouchableOpacity>
  );

  const Divider = () => <View style={[styles.divider, { backgroundColor: C.borderLight }]} />;

  /* ═══════════════════════════════════════════
     PIN value helper
     ═══════════════════════════════════════════ */
  const pinValue = passcodeStep === 'confirm' ? confirmPasscode : passcodeInput;
  const handlePinChange = (t) => {
    const clean = t.replace(/[^0-9]/g, '');
    if (passcodeStep === 'confirm') setConfirmPasscode(clean);
    else setPasscodeInput(clean);
    setPasscodeError('');
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ══════════════════════════════════════
          1. APPEARANCE
          ══════════════════════════════════════ */}
      <SectionHeader icon="color-palette" title="Appearance" first />
      <View style={[styles.card, { backgroundColor: C.surface }]}>
        {/* Theme Color */}
        <View style={styles.settingBlock}>
          <Text style={[styles.settingLabel, { color: C.text }]}>Theme Color</Text>
          <View style={styles.colorRow}>
            {THEME_COLORS.map((c) => (
              <TouchableOpacity
                key={c.key}
                style={styles.colorOption}
                onPress={() => handleThemeColor(c.color)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.color },
                    themeColor === c.color && styles.colorCircleActive,
                  ]}
                >
                  {themeColor === c.color && (
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.colorLabel,
                    { color: C.textSecondary },
                    themeColor === c.color && { color: c.color, fontWeight: '700' },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Divider />

        {/* Color Mode */}
        <View style={styles.settingBlock}>
          <Text style={[styles.settingLabel, { color: C.text }]}>Color Mode</Text>
          <View style={[styles.segmentRow, { backgroundColor: C.inputBg }]}>
            {COLOR_MODES.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.segmentBtn,
                  colorMode === m.key && { backgroundColor: themeColor },
                ]}
                onPress={() => handleColorMode(m.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={m.icon}
                  size={15}
                  color={colorMode === m.key ? '#FFF' : C.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    { color: C.textSecondary },
                    colorMode === m.key && styles.segmentTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Divider />

        {/* Font Size */}
        <View style={styles.settingBlock}>
          <Text style={[styles.settingLabel, { color: C.text }]}>Font Size</Text>
          <View style={styles.fontRow}>
            {FONT_SIZES.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.fontBtn,
                  { backgroundColor: C.inputBg, borderColor: C.borderLight },
                  fontSize === f.key && { backgroundColor: themeColor, borderColor: themeColor },
                ]}
                onPress={() => handleFontSize(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.fontBtnLetter,
                    { fontSize: f.demo + 2, color: C.text },
                    fontSize === f.key && styles.fontBtnLetterActive,
                  ]}
                >
                  Aa
                </Text>
                <Text
                  style={[
                    styles.fontBtnLabel,
                    { color: C.textSecondary },
                    fontSize === f.key && styles.fontBtnLabelActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Preview */}
          <View style={[styles.fontPreview, { backgroundColor: C.inputBg }]}>
            <Text style={[styles.fontPreviewText, { fontSize: currentFontDemo, color: C.textSecondary }]}>
              Preview: The quick brown fox jumps over the lazy dog
            </Text>
          </View>
        </View>
      </View>

      {/* ══════════════════════════════════════
          2. NOTIFICATIONS
          ══════════════════════════════════════ */}
      <SectionHeader icon="notifications" title="Notifications" color="#D4883E" />
      <View style={[styles.card, { backgroundColor: C.surface }]}>
        <SettingRow
          label="Enable Notifications"
          right={
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: C.border, true: themeColor + '80' }}
              thumbColor={notificationsEnabled ? themeColor : C.inputBg}
            />
          }
          last={!notificationsEnabled}
        />

        {notificationsEnabled && (
          <>
            <Divider />
            <View style={styles.settingBlock}>
              <Text style={[styles.settingLabel, { color: C.text }]}>Remind Before Event</Text>
              <Text style={[styles.settingSubtitle, { color: C.textSecondary }]}>Get notified before the event starts</Text>
              <View style={styles.chipRow}>
                {NOTIFY_BEFORE_OPTIONS.map((o) => (
                  <TouchableOpacity
                    key={o.key}
                    style={[
                      styles.chip,
                      { backgroundColor: C.inputBg, borderColor: C.border },
                      notifyBefore === o.key && { backgroundColor: themeColor, borderColor: themeColor },
                    ]}
                    onPress={() => handleNotifyBefore(o.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: C.textSecondary },
                        notifyBefore === o.key && styles.chipTextActive,
                      ]}
                    >
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </View>

      {/* ══════════════════════════════════════
          3. PRIVACY & SECURITY
          ══════════════════════════════════════ */}
      <SectionHeader icon="shield-checkmark" title="Privacy & Security" color="#1565C0" />
      <View style={[styles.card, { backgroundColor: C.surface }]}>
        <SettingRow
          label="Passcode Lock"
          subtitle={passcodeLock ? '4-digit PIN enabled' : 'Protect app with a PIN'}
          right={
            <Switch
              value={passcodeLock}
              onValueChange={handlePasscodeToggle}
              trackColor={{ false: C.border, true: themeColor + '80' }}
              thumbColor={passcodeLock ? themeColor : C.inputBg}
            />
          }
        />
        <Divider />
        <SettingRow
          label="Maps & Location"
          subtitle="Show directions and map links"
          right={
            <Switch
              value={mapsEnabled}
              onValueChange={handleMapsToggle}
              trackColor={{ false: C.border, true: themeColor + '80' }}
              thumbColor={mapsEnabled ? themeColor : C.inputBg}
            />
          }
        />
        <Divider />
        <SettingRow
          label="Biometric Authentication"
          subtitle="Use Face ID or fingerprint"
          right={
            <View style={[styles.comingSoonBadge, { backgroundColor: C.warningLight }]}>
              <Text style={[styles.comingSoonText, { color: C.warning }]}>Soon</Text>
            </View>
          }
        />
        <Divider />
        <SettingRow
          label="Clear App Data"
          subtitle="Delete all events, travel & settings"
          right={<Ionicons name="chevron-forward" size={18} color={C.textMuted} />}
          onPress={handleClearData}
          last
        />
      </View>

      {/* ══════════════════════════════════════
          4. FEEDBACK
          ══════════════════════════════════════ */}
      <SectionHeader icon="chatbubble-ellipses" title="Feedback" color="#2D8B5F" />
      <View style={[styles.card, { backgroundColor: C.surface }]}>
        <SettingRow
          label="Contact Support"
          subtitle="Send us your feedback or report issues"
          right={<Ionicons name="chevron-forward" size={18} color={C.textMuted} />}
          onPress={() => {
            setFbSubject('');
            setFbMessage('');
            setShowFeedbackModal(true);
          }}
          last
        />
      </View>

      {/* ══════════════════════════════════════
          5. ABOUT
          ══════════════════════════════════════ */}
      <SectionHeader icon="information-circle" title="About" color="#37474F" />
      <View style={[styles.card, { backgroundColor: C.surface }]}>
        <SettingRow
          label="Privacy Policy"
          subtitle="How we handle your data"
          right={<Ionicons name="chevron-forward" size={18} color={C.textMuted} />}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />
        <Divider />
        <SettingRow
          label="Version"
          right={<Text style={[styles.versionText, { color: C.textSecondary }]}>1.0.0</Text>}
        />
        <Divider />
        <SettingRow
          label="MUA Planner"
          right={<Text style={[styles.versionText, { color: C.textSecondary }]}>© 2026</Text>}
          last
        />
      </View>

      {/* ══════════════════════════════════════
          SIGN OUT
          ══════════════════════════════════════ */}
      <TouchableOpacity
        style={[styles.signOutBtn, { backgroundColor: C.surface, borderColor: C.danger + '30' }]}
        activeOpacity={0.7}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={20} color={C.danger} />
        <Text style={[styles.signOutText, { color: C.danger }]}>Sign Out</Text>
      </TouchableOpacity>

      {/* ── footer tagline ──────────────────── */}
      <Text style={[styles.footerText, { color: C.textMuted }]}>Made with 💄 for makeup artists</Text>

      <View style={{ height: 40 }} />

      {/* ══════════════════════════════════════
          PASSCODE MODAL
          ══════════════════════════════════════ */}
      <Modal visible={showPasscodeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.surface }]}>
            {/* Header */}
            <View style={[styles.modalIconWrap, { backgroundColor: themeColor + '18' }]}>
              <Ionicons name="lock-closed" size={28} color={themeColor} />
            </View>
            <Text style={[styles.modalTitle, { color: C.text }]}>
              {passcodeStep === 'enter'
                ? 'Set Passcode'
                : passcodeStep === 'confirm'
                ? 'Confirm Passcode'
                : 'Enter Passcode'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>
              {passcodeStep === 'enter'
                ? 'Choose a 4-digit PIN'
                : passcodeStep === 'confirm'
                ? 'Re-enter your PIN to confirm'
                : 'Enter your current PIN to disable'}
            </Text>

            {/* PIN dots indicator */}
            <View style={styles.pinDotsRow}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    { borderColor: C.border, backgroundColor: C.inputBg },
                    i < pinValue.length && { backgroundColor: themeColor, borderColor: themeColor },
                  ]}
                />
              ))}
            </View>

            {/* Hidden but focusable text input */}
            <TextInput
              ref={pinRef}
              style={styles.pinHiddenInput}
              keyboardType="number-pad"
              maxLength={4}
              value={pinValue}
              onChangeText={handlePinChange}
              autoFocus
              caretHidden
            />

            {passcodeError ? (
              <Text style={styles.pinError}>{passcodeError}</Text>
            ) : (
              <View style={{ height: 20 }} />
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.border }]}
                onPress={() => setShowPasscodeModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: themeColor }]}
                onPress={handlePasscodeSubmit}
              >
                <Text style={styles.modalConfirmText}>
                  {passcodeStep === 'confirm'
                    ? 'Set PIN'
                    : passcodeStep === 'verify'
                    ? 'Disable'
                    : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          FEEDBACK MODAL
          ══════════════════════════════════════ */}
      <Modal visible={showFeedbackModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.feedbackBox, { backgroundColor: C.surface }]}>
            {/* Header */}
            <View style={styles.feedbackHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.sectionIcon, { backgroundColor: '#2D8B5F' }]}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
                </View>
                <Text style={[styles.feedbackTitle, { color: C.text }]}>Contact Support</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <Ionicons name="close-circle" size={28} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fbLabel, { color: C.textSecondary }]}>Subject</Text>
            <TextInput
              style={[styles.fbInput, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
              placeholder="e.g. Bug report, Feature request"
              placeholderTextColor={C.textMuted}
              value={fbSubject}
              onChangeText={setFbSubject}
            />

            <Text style={[styles.fbLabel, { color: C.textSecondary }]}>Message *</Text>
            <TextInput
              style={[styles.fbInput, styles.fbTextArea, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
              placeholder="Describe your feedback or issue..."
              placeholderTextColor={C.textMuted}
              value={fbMessage}
              onChangeText={setFbMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.fbSubmitBtn, { backgroundColor: themeColor }]}
              onPress={handleSubmitFeedback}
              activeOpacity={0.8}
              disabled={fbSending}
            >
              {fbSending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFF" />
                  <Text style={styles.fbSubmitText}>Submit Feedback</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },

  /* ── section header ──────────────────────── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.3,
  },

  /* ── card ─────────────────────────────────── */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },

  /* ── setting row ─────────────────────────── */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* ── setting block (multi-line) ──────────── */
  settingBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  /* ── divider ─────────────────────────────── */
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 16,
  },

  /* ── theme color picker ──────────────────── */
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  colorOption: {
    alignItems: 'center',
    gap: 6,
  },
  colorCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  colorLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  /* ── segmented control (color mode) ──────── */
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  /* ── font size selector ──────────────────── */
  fontRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  fontBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.inputBg,
  },
  fontBtnLetter: {
    fontWeight: '700',
    color: COLORS.text,
  },
  fontBtnLetterActive: {
    color: '#FFF',
  },
  fontBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  fontBtnLabelActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  fontPreview: {
    marginTop: 14,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 12,
  },
  fontPreviewText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    lineHeight: 22,
  },

  /* ── chips (notify options) ──────────────── */
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFF',
  },

  /* ── coming soon badge ───────────────────── */
  comingSoonBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
  },

  /* ── version text ────────────────────────── */
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  /* ── footer tagline ──────────────────────── */
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 24,
  },

  /* ── sign out button ─────────────────────── */
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── modal overlay ───────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,46,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── passcode modal ──────────────────────── */
  modalBox: {
    width: SCREEN_WIDTH - 64,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  pinHiddenInput: {
    width: 120,
    height: 44,
    fontSize: 24,
    letterSpacing: 16,
    textAlign: 'center',
    color: 'transparent',
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 160,
    opacity: 0.01,
  },
  pinError: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
    marginTop: 4,
    height: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },

  /* ── feedback modal ──────────────────────── */
  feedbackBox: {
    width: SCREEN_WIDTH - 32,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  fbLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 14,
  },
  fbInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  fbTextArea: {
    height: 120,
    paddingTop: 12,
  },
  fbSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  fbSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
