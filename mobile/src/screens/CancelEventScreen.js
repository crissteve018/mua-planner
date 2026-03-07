import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { cancelEvent } from '../api/events';
import { COLORS, MONEY_OPTIONS } from '../constants';
import { useTheme } from '../context/SettingsContext';

function SectionHeader({ icon, iconColor, title }) {
  const C = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={16} color="#FFF" />
      </View>
      <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
    </View>
  );
}

export default function CancelEventScreen({ route, navigation }) {
  const C = useTheme();
  const { eventId, clientName } = route.params;
  const [saving, setSaving] = useState(false);

  const [cancelDate, setCancelDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [moneyOption, setMoneyOption] = useState('');
  const [moneyAmount, setMoneyAmount] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setDateValue(selectedDate);
      setCancelDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const handleSave = async () => {
    if (!cancelDate) {
      Alert.alert('Required', 'Please select the date of cancellation.');
      return;
    }

    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel the event for "${clientName}"? This will mark the event as cancelled.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Event',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const payload = {
                cancelDate,
                cancelReason,
                moneyOption,
                moneyAmount: parseFloat(moneyAmount) || 0,
              };
              const result = await cancelEvent(eventId, payload);
              if (result.success) {
                Alert.alert('Cancelled', 'Event has been marked as cancelled.', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              }
            } catch (err) {
              Alert.alert('Error', 'Could not cancel event.');
              console.error(err);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const needsAmount = moneyOption === 'received' || moneyOption === 'returned';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning banner */}
        <View style={[styles.warningBanner, { backgroundColor: C.dangerLight }]}>
          <Ionicons name="warning" size={22} color={C.danger} />
          <Text style={[styles.warningText, { color: C.danger }]}>
            You are about to cancel the event for <Text style={{ fontWeight: '800' }}>{clientName}</Text>
          </Text>
        </View>

        {/* ── Cancellation Details ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="clipboard" iconColor={C.sectionCancel} title="Cancellation Details" />

          <Text style={[styles.label, { color: C.textSecondary }]}>Date of Cancellation *</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: C.inputBg, borderColor: C.borderLight }, showDatePicker && styles.dateBtnActive]}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Ionicons name="calendar-outline" size={20} color={C.primary} />
            <Text style={[styles.dateBtnText, { color: C.text }, !cancelDate && { color: C.textSecondary }]}>
              {cancelDate ? formatDisplayDate(cancelDate) : 'Select date'}
            </Text>
            <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          {showDatePicker && (
            <View style={[styles.pickerWrapper, { backgroundColor: C.surface }]}>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
                accentColor={C.primary}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.doneBtnText, { color: C.primary }]}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={[styles.label, { color: C.textSecondary }]}>Reason for Cancellation</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
            placeholder="Why was the event cancelled?"
            placeholderTextColor={C.textMuted}
            value={cancelReason}
            onChangeText={setCancelReason}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* ── Money Options ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="cash" iconColor={C.sectionMoney} title="Transaction Details" />

          {MONEY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.radioRow, { backgroundColor: C.inputBg, borderColor: C.borderLight }, moneyOption === opt.key && [styles.radioRowActive, { borderColor: C.primary, backgroundColor: C.primaryLight }]]}
              onPress={() => setMoneyOption(opt.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={moneyOption === opt.key ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={moneyOption === opt.key ? C.primary : C.textMuted}
              />
              <Text style={[styles.radioLabel, { color: C.text }, moneyOption === opt.key && [styles.radioLabelActive, { color: C.primary }]]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}

          {needsAmount && (
            <>
              <Text style={[styles.label, { color: C.textSecondary }]}>
                {moneyOption === 'received' ? 'Amount Received (₹)' : 'Amount Returned (₹)'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                placeholder="e.g. 5000"
                placeholderTextColor={C.textMuted}
                value={moneyAmount}
                onChangeText={setMoneyAmount}
                keyboardType="numeric"
              />
            </>
          )}
        </View>

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: C.danger }, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <View style={styles.saveBtnInner}>
              <Ionicons name="close-circle" size={22} color={C.white} />
              <Text style={styles.saveButtonText}>Save & Mark Cancelled</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16 },

  warningBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.dangerLight, borderRadius: 12,
    padding: 14, marginBottom: 16, gap: 10,
    borderWidth: 1, borderColor: '#FFCDD2',
  },
  warningText: { flex: 1, fontSize: 14, color: COLORS.danger, lineHeight: 20 },

  section: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderLight,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  iconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, letterSpacing: 0.2 },

  label: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: 6, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  input: {
    backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.borderLight,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderLight, gap: 10,
  },
  dateBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  dateBtnText: { fontSize: 15, color: COLORS.text },
  pickerWrapper: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    marginTop: 8, overflow: 'hidden',
  },
  doneBtn: {
    alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 10,
    marginBottom: 4, marginRight: 4,
  },
  doneBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },

  // ── Radio options ──
  radioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.borderLight,
    backgroundColor: COLORS.inputBg,
  },
  radioRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  radioLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  radioLabelActive: { fontWeight: '700', color: COLORS.primary },

  saveButton: {
    backgroundColor: COLORS.danger, borderRadius: 14, padding: 18, alignItems: 'center',
    shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
