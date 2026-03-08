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
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllEvents } from '../api/events';
import { createTeamMember } from '../api/team';
import { COLORS, TEAM_ROLES } from '../constants';
import { useTheme } from '../context/SettingsContext';

/* ── section header component ─────────────────── */
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

export default function AddTeamScreen({ navigation, route }) {
  const C = useTheme();
  const preselectedEventId = route.params?.eventId || null;

  // Event picker
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId);
  const [selectedEventLabel, setSelectedEventLabel] = useState('');
  const [eventPickerVisible, setEventPickerVisible] = useState(false);
  const [eventSearch, setEventSearch] = useState('');

  // Form
  const [teamRole, setTeamRole] = useState('hairstylist');
  const [memberName, setMemberName] = useState('');
  const [amount, setAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Load events for picker
  useEffect(() => {
    (async () => {
      try {
        const res = await getAllEvents({ status: 'upcoming' });
        if (res.success) {
          setEvents(res.data);
          if (preselectedEventId) {
            const ev = res.data.find((e) => e.id === preselectedEventId);
            if (ev) setSelectedEventLabel(`${ev.clientName} — ${ev.eventType}`);
          }
        }
      } catch (err) {
        console.error('Error loading events:', err);
      }
    })();
  }, []);

  const filteredEvents = events.filter(
    (e) =>
      e.clientName?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      e.eventType?.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!selectedEventId) return Alert.alert('Required', 'Please select an event.');
    if (!memberName.trim()) return Alert.alert('Required', 'Please enter the member name.');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Required', 'Please enter the amount to pay.');

    setSaving(true);
    try {
      const res = await createTeamMember({
        eventId: selectedEventId,
        teamRole,
        memberName: memberName.trim(),
        amount: parseFloat(amount) || 0,
        amountPaid: parseFloat(amountPaid) || 0,
        notes: notes.trim(),
      });
      if (res.success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', res.error || 'Could not save team member.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save team member.');
    } finally {
      setSaving(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPaid = parseFloat(amountPaid) || 0;
  const balance = Math.max(0, parsedAmount - parsedPaid);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Link to Event ── */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="calendar" color={C.primary} title="Link to Event" />
          <TouchableOpacity
            style={[styles.picker, { borderColor: C.border, backgroundColor: C.inputBg }]}
            onPress={() => setEventPickerVisible(true)}
          >
            <Text style={[styles.pickerText, { color: selectedEventId ? C.text : C.textMuted }]}>
              {selectedEventLabel || 'Select an event…'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Role Selector ── */}
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
                  <Text style={[styles.roleMax, { color: C.textMuted }]}>Max {r.max}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Member Details ── */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="person" color="#1565C0" title="Member Details" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            placeholder="Enter member name"
            placeholderTextColor={C.textMuted}
            value={memberName}
            onChangeText={setMemberName}
          />
          <Text style={[styles.label, { color: C.textSecondary }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            placeholder="Any notes…"
            placeholderTextColor={C.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ── Payment ── */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="wallet" color="#D4883E" title="Payment" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Amount to Pay (₹)</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            placeholder="0"
            placeholderTextColor={C.textMuted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <Text style={[styles.label, { color: C.textSecondary }]}>Amount Paid (₹)</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
            placeholder="0"
            placeholderTextColor={C.textMuted}
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="numeric"
          />

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

        {/* ── Save Button ── */}
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
              <Text style={styles.saveBtnText}>Add Team Member</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Event Picker Modal ── */}
      <Modal visible={eventPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Select Event</Text>
              <TouchableOpacity onPress={() => { setEventPickerVisible(false); setEventSearch(''); }}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalSearch, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
              placeholder="Search events…"
              placeholderTextColor={C.textMuted}
              value={eventSearch}
              onChangeText={setEventSearch}
            />
            <FlatList
              data={filteredEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: C.borderLight }]}
                  onPress={() => {
                    setSelectedEventId(item.id);
                    setSelectedEventLabel(`${item.clientName} — ${item.eventType}`);
                    setEventPickerVisible(false);
                    setEventSearch('');
                  }}
                >
                  <Text style={[styles.modalItemName, { color: C.text }]}>{item.clientName}</Text>
                  <Text style={[styles.modalItemSub, { color: C.textSecondary }]}>{item.eventType}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: C.textMuted }]}>No events found</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
  },
  pickerText: { fontSize: 15, flex: 1 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleChip: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12,
    width: '47%',
  },
  roleLabel: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  roleMax: { fontSize: 10, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
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
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSearch: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1 },
  modalItemName: { fontSize: 15, fontWeight: '600' },
  modalItemSub: { fontSize: 12, marginTop: 2 },
  emptyText: { textAlign: 'center', paddingVertical: 30, fontSize: 14 },
});
