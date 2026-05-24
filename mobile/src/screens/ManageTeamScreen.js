import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import {
  getTeamContacts,
  createTeamContact,
  updateTeamContact,
  deleteTeamContact,
} from '../api/team';
import { TEAM_ROLES, TEAM_ROLE_MAP } from '../constants';
import { useTheme } from '../context/SettingsContext';

export default function ManageTeamScreen({ navigation }) {
  const C = useTheme();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('assistant');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [rolePickerVisible, setRolePickerVisible] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await getTeamContacts();
      if (res.success) setContacts(res.data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [fetchContacts])
  );

  /* ── header right button ─────────────────────── */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={openAdd}
            accessibilityLabel="Add team member"
          >
            <Ionicons name="add-circle" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, C]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setRole('');
    setPhone('');
    setModalVisible(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setName(contact.name);
    setRole(contact.defaultRole);
    setPhone(contact.phone || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter a name.');
    if (!role) return Alert.alert('Required', 'Please select a role.');
    setSaving(true);
    try {
      const payload = { name: name.trim(), defaultRole: role, phone: phone.trim() };
      const res = editing
        ? await updateTeamContact(editing.id, payload)
        : await createTeamContact(payload);
      if (res.success) {
        setModalVisible(false);
        fetchContacts();
      } else {
        Alert.alert('Error', res.error || 'Could not save contact.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not save contact.');
    } finally {
      setSaving(false);
    }
  };

  const pickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow access to contacts in Settings to use this feature.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });
      if (data.length > 0) {
        // Show contact picker
        const contactNames = data
          .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
          .slice(0, 100); // Limit for performance
        
        if (contactNames.length === 0) {
          Alert.alert('No Contacts', 'No contacts with phone numbers found.');
          return;
        }
        
        // For simplicity, we'll use the first phone number of each contact
        // In production, you might want a proper picker UI
        const options = contactNames.map(c => ({
          text: `${c.name} (${c.phoneNumbers[0].number})`,
          onPress: () => {
            setPhone(c.phoneNumbers[0].number);
            if (!name.trim() && c.name) {
              setName(c.name);
            }
          },
        }));
        
        // Show as alert with options (limited to avoid issues)
        const displayOptions = options.slice(0, 10);
        displayOptions.push({ text: 'Cancel', style: 'cancel' });
        
        Alert.alert('Select Contact', 'Choose a contact:', displayOptions);
      } else {
        Alert.alert('No Contacts', 'No contacts found on this device.');
      }
    } catch (err) {
      console.error('Error picking contact:', err);
      Alert.alert('Error', 'Could not access contacts.');
    }
  };

  const handleDelete = (contact) => {
    Alert.alert('Delete Contact', `Remove ${contact.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTeamContact(contact.id);
            fetchContacts();
          } catch (err) {
            Alert.alert('Error', 'Could not delete contact.');
          }
        },
      },
    ]);
  };

  const roleInfo = TEAM_ROLE_MAP[role];

  const renderContact = ({ item }) => {
    const ri = TEAM_ROLE_MAP[item.defaultRole];
    const pending = item.pendingBalance || 0;
    return (
      <TouchableOpacity
        style={[styles.contactCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TeamContactDetail', { contactId: item.id, contactName: item.name })}
      >
        <View style={[styles.contactIcon, { backgroundColor: (ri?.color || '#999') + '18' }]}>
          <Ionicons name={ri?.icon || 'person'} size={20} color={ri?.color || '#999'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.contactName, { color: C.text }]}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text style={[styles.contactRole, { color: ri?.color || C.textSecondary }]}>{ri?.label || item.defaultRole}</Text>
            {item.phone ? <Text style={[styles.contactPhone, { color: C.textMuted }]}> · {item.phone}</Text> : null}
          </View>
        </View>
        {pending > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: '#FF6B6B18' }]}>
            <Text style={styles.pendingText}>₹{pending.toLocaleString('en-IN')}</Text>
            <Text style={styles.pendingLabel}>pending</Text>
          </View>
        )}
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={18} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={C.danger} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No Team Members Yet</Text>
            <Text style={[styles.emptyHint, { color: C.textMuted }]}>
              Add your frequent team members here so you can quickly select them when creating events.
            </Text>
          </View>
        }
      />

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>
                {rolePickerVisible ? 'Select Role' : editing ? 'Edit Contact' : 'Add Contact'}
              </Text>
              <TouchableOpacity onPress={() => {
                if (rolePickerVisible) { setRolePickerVisible(false); }
                else { setModalVisible(false); }
              }}>
                <Ionicons name={rolePickerVisible ? 'arrow-back' : 'close'} size={24} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {rolePickerVisible ? (
              /* ── Inline Role List ── */
              <>
                {TEAM_ROLES.map((r) => {
                  const active = role === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.roleItem, {
                        borderBottomColor: C.borderLight,
                        backgroundColor: active ? r.color + '12' : 'transparent',
                      }]}
                      onPress={() => { setRole(r.key); setRolePickerVisible(false); }}
                    >
                      <View style={[styles.roleItemIcon, { backgroundColor: r.color + '18' }]}>
                        <Ionicons name={r.icon} size={20} color={r.color} />
                      </View>
                      <Text style={[styles.roleItemLabel, { color: active ? r.color : C.text }]}>{r.label}</Text>
                      {active && <Ionicons name="checkmark" size={20} color={r.color} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              /* ── Contact Form ── */
              <>
                <Text style={[styles.label, { color: C.textSecondary }]}>Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
                  placeholder="Enter name"
                  placeholderTextColor={C.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  textContentType="name"
                />

                <Text style={[styles.label, { color: C.textSecondary }]}>Role</Text>
                <TouchableOpacity
                  style={[styles.picker, { borderColor: C.border, backgroundColor: C.inputBg }]}
                  onPress={() => setRolePickerVisible(true)}
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

                <Text style={[styles.label, { color: C.textSecondary }]}>Phone (optional)</Text>
                <View style={styles.phoneInputRow}>
                  <TextInput
                    style={[styles.input, styles.phoneInput, { borderColor: C.border, backgroundColor: C.inputBg, color: C.text }]}
                    placeholder="Phone number"
                    placeholderTextColor={C.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity
                    style={[styles.contactPickerBtn, { backgroundColor: C.primary }]}
                    onPress={pickContact}
                    accessibilityLabel="Pick from contacts"
                  >
                    <Ionicons name="person-add" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.primary, opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Add Contact'}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12,
    borderWidth: 1, marginBottom: 10, gap: 12,
  },
  contactIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contactName: { fontSize: 15, fontWeight: '700' },
  contactRole: { fontSize: 12, fontWeight: '600' },
  contactPhone: { fontSize: 12 },
  iconBtn: { padding: 6 },
  pendingBadge: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pendingText: { fontSize: 14, fontWeight: '800', color: '#FF6B6B' },
  pendingLabel: { fontSize: 9, fontWeight: '600', color: '#FF6B6B', textTransform: 'uppercase', marginTop: 1 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginTop: 16 },
  emptyHint: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneInput: { flex: 1 },
  contactPickerBtn: {
    width: 46, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
  },
  pickerText: { fontSize: 15, flex: 1 },
  saveBtn: {
    borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  roleItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, gap: 12,
  },
  roleItemIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  roleItemLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
});
