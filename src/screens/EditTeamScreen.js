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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTeamMemberById, updateTeamMember } from '../api/team';
import { COLORS, TEAM_ROLES, TEAM_ROLE_MAP } from '../constants';
import { useTheme } from '../context/SettingsContext';

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
  const [rolePickerVisible, setRolePickerVisible] = useState(false);

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

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPaid = parseFloat(amountPaid) || 0;
  const balance = Math.max(0, parsedAmount - parsedPaid);
  const isSettled = parsedAmount > 0 && parsedPaid >= parsedAmount;

  const handleSettle = () => {
    if (parsedAmount > 0) {
      setAmountPaid(amount);
    }
  };

  const handleUnsettle = () => {
    setAmountPaid('0');
  };

  const handleSave = async () => {
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

  const roleInfo = TEAM_ROLE_MAP[teamRole];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Event label (read-only) */}
        {eventLabel ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <Text style={[styles.cardTitle, { color: C.textSecondary }]}>Event</Text>
            <Text style={[styles.eventLabel, { color: C.text }]}>{eventLabel}</Text>
          </View>
        ) : null}

        {/* Name (read-only) */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Text style={[styles.cardTitle, { color: C.textSecondary }]}>Name</Text>
          <Text style={[styles.nameText, { color: C.text }]}>{memberName}</Text>
        </View>

        {/* Role Dropdown */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Text style={[styles.cardTitle, { color: C.textSecondary }]}>Team Role</Text>
          <TouchableOpacity
            style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.inputBg }]}
            onPress={() => setRolePickerVisible(true)}
          >
            {roleInfo ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                <Ionicons name={roleInfo.icon} size={16} color={roleInfo.color} />
                <Text style={[styles.dropdownText, { color: C.text }]}>{roleInfo.label}</Text>
              </View>
            ) : (
              <Text style={[styles.dropdownText, { color: C.textMuted }]}>Select role…</Text>
            )}
            <Ionicons name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Payment */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Text style={[styles.cardTitle, { color: C.textSecondary }]}>Payment</Text>

          <Text style={[styles.label, { color: C.textSecondary }]}>Amount to Pay (₹)</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            value={amount}
            onChangeText={(v) => { setAmount(v); }}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.textMuted}
            textContentType="none"
          />

          {/* Settled toggle */}
          <TouchableOpacity
            style={[styles.settledRow, { backgroundColor: isSettled ? '#E8F5EE' : C.inputBg, borderColor: isSettled ? '#2D8B5F' : C.border }]}
            onPress={isSettled ? handleUnsettle : handleSettle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSettled ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSettled ? '#2D8B5F' : C.textMuted}
            />
            <Text style={[styles.settledText, { color: isSettled ? '#2D8B5F' : C.text }]}>Settled</Text>
          </TouchableOpacity>

          {/* Show amounts when not fully settled */}
          {!isSettled && parsedAmount > 0 && (
            <>
              <Text style={[styles.label, { color: C.textSecondary }]}>Amount Paid (₹)</Text>
              <TextInput
                style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
                value={amountPaid}
                onChangeText={setAmountPaid}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.textMuted}
              />
            </>
          )}

          {/* Payment summary */}
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
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Text style={[styles.cardTitle, { color: C.textSecondary }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Any notes..."
            placeholderTextColor={C.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Role Picker Modal */}
      <Modal visible={rolePickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Select Role</Text>
              <TouchableOpacity onPress={() => setRolePickerVisible(false)}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            {TEAM_ROLES.map((r) => {
              const active = teamRole === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleItem, {
                    borderBottomColor: C.borderLight,
                    backgroundColor: active ? r.color + '12' : 'transparent',
                  }]}
                  onPress={() => { setTeamRole(r.key); setRolePickerVisible(false); }}
                >
                  <View style={[styles.roleItemIcon, { backgroundColor: r.color + '18' }]}>
                    <Ionicons name={r.icon} size={20} color={r.color} />
                  </View>
                  <Text style={[styles.roleItemLabel, { color: active ? r.color : C.text }]}>{r.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={r.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 },
  eventLabel: { fontSize: 15, fontWeight: '600' },
  nameText: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
  },
  dropdownText: { fontSize: 15, flex: 1 },
  settledRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14,
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1,
  },
  settledText: { fontSize: 15, fontWeight: '700' },
  paymentSummary: { borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  payLabel: { fontSize: 13 },
  payValue: { fontSize: 14, fontWeight: '600' },
  saveBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 16, marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  roleItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, gap: 12,
  },
  roleItemIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  roleItemLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
});
