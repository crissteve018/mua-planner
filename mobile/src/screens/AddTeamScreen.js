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
import { createTeamMember, getTeamContacts } from '../api/team';
import { TEAM_ROLES, TEAM_ROLE_MAP } from '../constants';
import { useTheme } from '../context/SettingsContext';

/* ── helpers ───────────────────────────────────── */
const formatDate = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};

const emptyMember = () => ({
  key: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  teamRole: '',
  memberName: '',
  contactId: '',
  amount: '',
  paymentOption: 'pending',
  amountPaid: '',
});

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

  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId);
  const [selectedEvent, setSelectedEvent] = useState(
    preselectedEventId ? {
      id: preselectedEventId,
      clientName: route.params?.eventName || '',
      eventType: route.params?.eventType || '',
      eventDate: route.params?.eventDate || '',
      city: route.params?.eventCity || '',
    } : null
  );
  const [events, setEvents] = useState([]);
  const [eventPickerVisible, setEventPickerVisible] = useState(false);
  const [eventSearch, setEventSearch] = useState('');

  const [contacts, setContacts] = useState([]);
  const [members, setMembers] = useState([emptyMember()]);
  const [saving, setSaving] = useState(false);

  const [namePickerVisible, setNamePickerVisible] = useState(false);
  const [namePickerIndex, setNamePickerIndex] = useState(0);
  const [nameSearch, setNameSearch] = useState('');

  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [rolePickerIndex, setRolePickerIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [evRes, ctRes] = await Promise.all([
          getAllEvents({ status: 'upcoming' }),
          getTeamContacts(),
        ]);
        if (evRes.success) {
          setEvents(evRes.data);
          if (preselectedEventId && !selectedEvent?.eventType) {
            const ev = evRes.data.find((e) => e.id === preselectedEventId);
            if (ev) setSelectedEvent(ev);
          }
        }
        if (ctRes.success) setContacts(ctRes.data);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    })();
  }, []);

  const filteredEvents = events.filter(
    (e) =>
      e.clientName?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      e.eventType?.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const getFilteredContacts = (memberIndex) => {
    const role = members[memberIndex]?.teamRole;
    let list = contacts;
    if (role) list = contacts.filter(c => c.defaultRole === role);
    if (nameSearch) {
      list = list.filter(c => c.name.toLowerCase().includes(nameSearch.toLowerCase()));
    }
    return list;
  };

  const updateMember = (index, field, value) => {
    setMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeMember = (index) => {
    if (members.length <= 1) return;
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  const addMember = () => {
    setMembers(prev => [...prev, emptyMember()]);
  };

  const handleSave = async () => {
    if (!selectedEventId) return Alert.alert('Required', 'Please select an event.');
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.teamRole) return Alert.alert('Required', `Please select a role for Member ${i + 1}.`);
      if (!m.memberName.trim()) return Alert.alert('Required', `Please select or enter a name for Member ${i + 1}.`);
      if (!m.amount || parseFloat(m.amount) <= 0) return Alert.alert('Required', `Please enter the amount for Member ${i + 1}.`);
      if (m.paymentOption === 'partial') {
        const paid = parseFloat(m.amountPaid) || 0;
        const total = parseFloat(m.amount) || 0;
        if (paid <= 0 || paid >= total) {
          return Alert.alert('Invalid', `Please enter a valid partial amount for Member ${i + 1}.`);
        }
      }
    }

    setSaving(true);
    try {
      for (const m of members) {
        const amountPaid = m.paymentOption === 'paid'
          ? parseFloat(m.amount) || 0
          : m.paymentOption === 'partial'
            ? parseFloat(m.amountPaid) || 0
            : 0;
        const res = await createTeamMember({
          eventId: selectedEventId,
          teamRole: m.teamRole,
          memberName: m.memberName.trim(),
          contactId: m.contactId || '',
          amount: parseFloat(m.amount) || 0,
          amountPaid,
        });
        if (!res.success) {
          Alert.alert('Error', res.error || `Could not save ${m.memberName}.`);
          setSaving(false);
          return;
        }
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save team members.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Linked to Event ── */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="calendar" color={C.primary} title={preselectedEventId ? 'Linked to Event' : 'Link to Event'} />
          {selectedEvent ? (
            <TouchableOpacity
              style={[styles.selectedEventCard, {
                backgroundColor: preselectedEventId ? C.border : C.surface,
                borderColor: preselectedEventId ? C.border : C.primary + '30',
              }]}
              onPress={() => !preselectedEventId && setEventPickerVisible(true)}
              activeOpacity={preselectedEventId ? 1 : 0.7}
              disabled={!!preselectedEventId}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedEventName, { color: preselectedEventId ? C.textMuted : C.text }]}>
                  {selectedEvent.clientName}
                </Text>
                <Text style={[styles.selectedEventInfo, { color: C.textSecondary }]}>
                  {selectedEvent.eventType}{selectedEvent.eventDate ? ` • ${formatDate(selectedEvent.eventDate)}` : ''}
                  {selectedEvent.city ? ` • ${selectedEvent.city}` : ''}
                </Text>
              </View>
              {!preselectedEventId && <Ionicons name="chevron-forward" size={18} color={C.textMuted} />}
              {preselectedEventId && <Ionicons name="lock-closed" size={16} color={C.textMuted} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.picker, { borderColor: C.border, backgroundColor: C.inputBg }]}
              onPress={() => setEventPickerVisible(true)}
            >
              <Text style={[styles.pickerText, { color: C.textMuted }]}>Select an event…</Text>
              <Ionicons name="chevron-down" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Team Members ── */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="people" color="#8E24AA" title="Team" />

          {members.map((member, index) => {
            const roleInfo = TEAM_ROLE_MAP[member.teamRole];
            const parsedAmount = parseFloat(member.amount) || 0;
            const parsedPaid = member.paymentOption === 'paid' ? parsedAmount
              : member.paymentOption === 'partial' ? (parseFloat(member.amountPaid) || 0)
              : 0;

            return (
              <View key={member.key} style={[styles.memberBlock, { borderColor: C.borderLight }]}>
                <View style={styles.memberHeader}>
                  <View style={[styles.memberBadge, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.memberBadgeText, { color: C.primary }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.memberTitle, { color: C.text }]}>Member {index + 1}</Text>
                  {members.length > 1 && (
                    <TouchableOpacity onPress={() => removeMember(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={18} color={C.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.label, { color: C.textSecondary }]}>Role</Text>
                <TouchableOpacity
                  style={[styles.picker, { borderColor: C.border, backgroundColor: C.inputBg }]}
                  onPress={() => { setRolePickerIndex(index); setRolePickerVisible(true); }}
                >
                  {roleInfo ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                      <Ionicons name={roleInfo.icon} size={16} color={roleInfo.color} />
                      <Text style={[styles.pickerText, { color: C.text }]}>{roleInfo.label}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.pickerText, { color: C.textMuted }]}>Select role…</Text>
                  )}
                  <Ionicons name="chevron-down" size={18} color={C.textMuted} />
                </TouchableOpacity>

                <Text style={[styles.label, { color: C.textSecondary }]}>Name</Text>
                <TouchableOpacity
                  style={[styles.picker, { borderColor: C.border, backgroundColor: C.inputBg }]}
                  onPress={() => {
                    setNamePickerIndex(index);
                    setNameSearch('');
                    setNamePickerVisible(true);
                  }}
                >
                  <Text style={[styles.pickerText, { color: member.memberName ? C.text : C.textMuted }]}>
                    {member.memberName || 'Select name…'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={C.textMuted} />
                </TouchableOpacity>

                <Text style={[styles.label, { color: C.textSecondary }]}>Amount to Pay (₹)</Text>
                <TextInput
                  style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                  value={member.amount}
                  onChangeText={(v) => updateMember(index, 'amount', v)}
                  keyboardType="numeric"
                />

                <Text style={[styles.label, { color: C.textSecondary }]}>Payment Status</Text>
                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={[styles.checkboxItem, {
                      borderColor: member.paymentOption === 'paid' ? '#2D8B5F' : C.border,
                      backgroundColor: member.paymentOption === 'paid' ? '#E8F5EE' : C.inputBg,
                    }]}
                    onPress={() => updateMember(index, 'paymentOption', member.paymentOption === 'paid' ? 'pending' : 'paid')}
                  >
                    <Ionicons
                      name={member.paymentOption === 'paid' ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={member.paymentOption === 'paid' ? '#2D8B5F' : C.textMuted}
                    />
                    <Text style={[styles.checkboxLabel, { color: member.paymentOption === 'paid' ? '#2D8B5F' : C.text }]}>Paid</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.checkboxItem, {
                      borderColor: member.paymentOption === 'partial' ? '#D4883E' : C.border,
                      backgroundColor: member.paymentOption === 'partial' ? '#FFF3E0' : C.inputBg,
                    }]}
                    onPress={() => updateMember(index, 'paymentOption', member.paymentOption === 'partial' ? 'pending' : 'partial')}
                  >
                    <Ionicons
                      name={member.paymentOption === 'partial' ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={member.paymentOption === 'partial' ? '#D4883E' : C.textMuted}
                    />
                    <Text style={[styles.checkboxLabel, { color: member.paymentOption === 'partial' ? '#D4883E' : C.text }]}>Partially Paid</Text>
                  </TouchableOpacity>
                </View>

                {member.paymentOption === 'partial' && (
                  <View>
                    <Text style={[styles.label, { color: C.textSecondary }]}>Amount Paid (₹)</Text>
                    <TextInput
                      style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
                      placeholder="0"
                      placeholderTextColor={C.textMuted}
                      value={member.amountPaid}
                      onChangeText={(v) => updateMember(index, 'amountPaid', v)}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {parsedAmount > 0 && (
                  <View style={[styles.miniSummary, {
                    backgroundColor: member.paymentOption === 'paid' ? '#E8F5EE' : member.paymentOption === 'partial' ? '#FFF3E0' : '#FFEBEE',
                  }]}>
                    <Ionicons
                      name={member.paymentOption === 'paid' ? 'checkmark-circle' : member.paymentOption === 'partial' ? 'remove-circle' : 'time'}
                      size={14}
                      color={member.paymentOption === 'paid' ? '#2D8B5F' : member.paymentOption === 'partial' ? '#D4883E' : '#C62828'}
                    />
                    <Text style={[styles.miniSummaryText, {
                      color: member.paymentOption === 'paid' ? '#2D8B5F' : member.paymentOption === 'partial' ? '#D4883E' : '#C62828',
                    }]}>
                      {member.paymentOption === 'paid'
                        ? `Fully Paid — ₹${parsedAmount.toLocaleString('en-IN')}`
                        : member.paymentOption === 'partial'
                          ? `₹${parsedPaid.toLocaleString('en-IN')} paid of ₹${parsedAmount.toLocaleString('en-IN')} — ₹${Math.max(0, parsedAmount - parsedPaid).toLocaleString('en-IN')} due`
                          : `Pending — ₹${parsedAmount.toLocaleString('en-IN')}`}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.addMemberBtn, { borderColor: C.primary + '40', backgroundColor: C.primaryLight }]}
            onPress={addMember}
          >
            <Ionicons name="add-circle" size={20} color={C.primary} />
            <Text style={[styles.addMemberText, { color: C.primary }]}>Add Another Member</Text>
          </TouchableOpacity>
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
              <Text style={styles.saveBtnText}>
                Save {members.length > 1 ? `${members.length} Members` : 'Team Member'}
              </Text>
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
                    setSelectedEvent(item);
                    setEventPickerVisible(false);
                    setEventSearch('');
                  }}
                >
                  <Text style={[styles.modalItemName, { color: C.text }]}>{item.clientName}</Text>
                  <Text style={[styles.modalItemSub, { color: C.textSecondary }]}>
                    {item.eventType}{item.eventDate ? ` • ${formatDate(item.eventDate)}` : ''}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: C.textMuted }]}>No events found</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── Role Picker Modal ── */}
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
              const active = members[rolePickerIndex]?.teamRole === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.rolePickerItem, {
                    borderBottomColor: C.borderLight,
                    backgroundColor: active ? r.color + '12' : 'transparent',
                  }]}
                  onPress={() => {
                    updateMember(rolePickerIndex, 'teamRole', r.key);
                    const currentContact = contacts.find(c => c.id === members[rolePickerIndex]?.contactId);
                    if (currentContact && currentContact.defaultRole !== r.key) {
                      updateMember(rolePickerIndex, 'memberName', '');
                      updateMember(rolePickerIndex, 'contactId', '');
                    }
                    setRolePickerVisible(false);
                  }}
                >
                  <View style={[styles.rolePickerIcon, { backgroundColor: r.color + '18' }]}>
                    <Ionicons name={r.icon} size={20} color={r.color} />
                  </View>
                  <Text style={[styles.rolePickerLabel, { color: active ? r.color : C.text }]}>{r.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={r.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ── Name Picker Modal ── */}
      <Modal visible={namePickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Select Name</Text>
              <TouchableOpacity onPress={() => setNamePickerVisible(false)}>
                <Ionicons name="close" size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalSearch, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
              placeholder="Search or type a new name…"
              placeholderTextColor={C.textMuted}
              value={nameSearch}
              onChangeText={setNameSearch}
            />
            <FlatList
              data={getFilteredContacts(namePickerIndex)}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                nameSearch.trim() ? (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: C.borderLight, flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                    onPress={() => {
                      updateMember(namePickerIndex, 'memberName', nameSearch.trim());
                      updateMember(namePickerIndex, 'contactId', '');
                      setNamePickerVisible(false);
                      setNameSearch('');
                    }}
                  >
                    <Ionicons name="pencil" size={16} color={C.primary} />
                    <Text style={[styles.modalItemName, { color: C.primary }]}>Use "{nameSearch.trim()}"</Text>
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => {
                const roleData = TEAM_ROLE_MAP[item.defaultRole];
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, { borderBottomColor: C.borderLight }]}
                    onPress={() => {
                      updateMember(namePickerIndex, 'memberName', item.name);
                      updateMember(namePickerIndex, 'contactId', item.id);
                      if (!members[namePickerIndex]?.teamRole && item.defaultRole) {
                        updateMember(namePickerIndex, 'teamRole', item.defaultRole);
                      }
                      setNamePickerVisible(false);
                      setNameSearch('');
                    }}
                  >
                    <Text style={[styles.modalItemName, { color: C.text }]}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      {roleData && <Ionicons name={roleData.icon} size={12} color={roleData.color} />}
                      <Text style={[styles.modalItemSub, { color: C.textSecondary }]}>
                        {roleData?.label || item.defaultRole}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                !nameSearch.trim() ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={32} color={C.textMuted} />
                    <Text style={[styles.emptyText, { color: C.textMuted }]}>No contacts yet</Text>
                    <Text style={[styles.emptyHint, { color: C.textMuted }]}>
                      Add team members from Home → My Team
                    </Text>
                  </View>
                ) : null
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
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  selectedEventCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1 },
  selectedEventName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  selectedEventInfo: { fontSize: 13 },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
  },
  pickerText: { fontSize: 15, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  memberBlock: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  memberBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  memberBadgeText: { fontSize: 13, fontWeight: '700' },
  memberTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  checkboxRow: { flexDirection: 'row', gap: 10 },
  checkboxItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1,
  },
  checkboxLabel: { fontSize: 14, fontWeight: '600' },
  miniSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
  },
  miniSummaryText: { fontSize: 12, fontWeight: '600', flex: 1 },
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
  },
  addMemberText: { fontSize: 14, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 16, marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSearch: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1 },
  modalItemName: { fontSize: 15, fontWeight: '600' },
  modalItemSub: { fontSize: 12, marginTop: 2 },
  emptyText: { textAlign: 'center', paddingVertical: 10, fontSize: 14 },
  emptyHint: { textAlign: 'center', fontSize: 12, marginTop: 4 },
  rolePickerItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, gap: 12,
  },
  rolePickerIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rolePickerLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
});
