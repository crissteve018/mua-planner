import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTeamMemberById, updateTeamMember } from '../api/team';
import { COLORS, TEAM_ROLES } from '../constants';
import { useTheme } from '../context/SettingsContext';

const SectionHeader = ({ icon, color, title }) => {
  const C = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#FFF" />
      </View>
      <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
    </View>
  );
};

export default function EditTeamScreen({ navigation, route }) {
  const C = useTheme();
  const teamMemberId = route.params?.teamMemberId;

  const [loading, setLoading] = useState(true);
  const [teamRole, setTeamRole] = useState('hairstylist');
  const [memberName, setMemberName] = useState('');
  const [amount, setAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [eventLabel, setEventLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getTeamMemberById(teamMemberId);
        if (res.success) {
          const m = res.data;
          setTeamRole(m.teamRole || 'hairstylist');
          setMemberName(m.memberName || '');
          setAmount(m.amount > 0 ? String(m.amount) : '');
          setAmountPaid(m.amountPaid > 0 ? String(m.amountPaid) : '');
          setNotes(m.notes || '');
          setEventLabel(m.eventName ? `${m.eventName} — ${m.eventType}` : '');
        }
      } catch (err) {
        Alert.alert('Error', 'Could not load team member.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [teamMemberId]);

  const handleSave = async () => {
    if (!memberName.trim()) return Alert.alert('Required', 'Please enter the member name.');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Required', 'Please enter the amount to pay.');

    setSaving(true);
    try {
      const res = await updateTeamMember(teamMemberId, {
        teamRole,
        memberName: memberName.trim(),
        amount: parseFloat(amount) || 0,
        amountPaid: parseFloat(amountPaid) || 0,
        notes: notes.trim(),
      });
      if (res.success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', res.error || 'Could not update team member.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update team member.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPaid = parseFloat(amountPaid) || 0;
  const balance = Math.max(0, parsedAmount - parsedPaid);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Event label (read-only) */}
        {eventLabel ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <SectionHeader icon="calendar" color={C.primary} title="Event" />
            <Text style={[styles.eventLabel, { color: C.text }]}>{eventLabel}</Text>
          </View>
        ) : null}

        {/* Role Selector */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="people" color="#8E24AA" title="Team Role" />
          <View style={styles.roleGrid}>
            {TEAM_ROLES.map((r) => {
              const active = teamRole === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[
                    styles.roleChip,
                    { borderColor: active ? r.color : C.borderLight, backgroundColor: active ? r.color + '15' : C.inputBg },
                  ]}
                  onPress={() => setTeamRole(r.key)}
                >
                  <Ionicons name={r.icon} size={18} color={active ? r.color : C.textMuted} />
                  <Text style={[styles.roleLabel, { color: active ? r.color : C.textSecondary }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Member Details */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="person" color="#1565C0" title="Member Details" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            value={memberName}
            onChangeText={setMemberName}
          />
          <Text style={[styles.label, { color: C.textSecondary }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="wallet" color="#D4883E" title="Payment" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Amount to Pay (₹)</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <Text style={[styles.label, { color: C.textSecondary }]}>Amount Paid (₹)</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="numeric"
          />

          {parsedAmount > 0 && (
            <View style={[styles.paymentSummary, { borderTopColor: C.borderLight }]}>
              <View style={styles.payRow}>
                <Text style={[styles.payLabel, { color: C.textSecondary }]}>Total</Text>
                <Text style={[styles.payValue, { color: C.text }]}>₹{parsedAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.payRow}>
                <Text style={[styles.payLabel, { color: C.textSecondary }]}>Paid</Text>
                <Text style={[styles.payValue, { color: '#2D8B5F' }]}>₹{parsedPaid.toLocaleString('en-IN')}</Text>
              </View>
              {balance > 0 && (
                <View style={styles.payRow}>
                  <Text style={[styles.payLabel, { color: C.warning }]}>Balance</Text>
                  <Text style={[styles.payValue, { color: C.warning, fontWeight: '700' }]}>₹{balance.toLocaleString('en-IN')}</Text>
                </View>
              )}
              <View style={[styles.statusRow, { backgroundColor: parsedPaid >= parsedAmount ? '#E8F5EE' : parsedPaid > 0 ? '#FFF3E0' : '#FFEBEE' }]}>
                <Ionicons
                  name={parsedPaid >= parsedAmount ? 'checkmark-circle' : parsedPaid > 0 ? 'remove-circle' : 'time'}
                  size={16}
                  color={parsedPaid >= parsedAmount ? '#2D8B5F' : parsedPaid > 0 ? '#D4883E' : '#C62828'}
                />
                <Text style={[styles.statusText, {
                  color: parsedPaid >= parsedAmount ? '#2D8B5F' : parsedPaid > 0 ? '#D4883E' : '#C62828',
                }]}>
                  {parsedPaid >= parsedAmount ? 'Fully Paid' : parsedPaid > 0 ? 'Partially Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  eventLabel: { fontSize: 15, fontWeight: '500' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleChip: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12,
    width: '47%',
  },
  roleLabel: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  paymentSummary: { borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  payLabel: { fontSize: 13 },
  payValue: { fontSize: 14, fontWeight: '600' },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 16, marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
