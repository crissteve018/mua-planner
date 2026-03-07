import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
  Linking,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getEventById, updateEvent } from '../api/events';
import { COLORS, EVENT_TYPES, EXTRA_SERVICES } from '../constants';
import { useTheme } from '../context/SettingsContext';
import { COUNTRIES, STATES_BY_COUNTRY, generateMapsUrl } from '../constants/locations';
import AutocompleteInput from '../components/AutocompleteInput';

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

export default function EditEventScreen({ route, navigation }) {
  const C = useTheme();
  const AC = {
    bg: C.inputBg,
    text: C.text,
    textLight: C.textMuted,
    border: C.border,
    primary: C.primary,
    surface: C.surface,
  };
  const { eventId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientName: '', clientPhone: '', alternativePhone: '', emailAddress: '',
    eventType: 'Engagement', eventDate: '', eventTime: '',
    country: '', state: '', city: '', buildingName: '', address: '',
    typeOfMakeup: '', packageAmount: '', advancePaid: '', notes: '',
    workLocationDifferent: false,
    workCountry: '', workState: '', workCity: '', workBuildingName: '', workAddress: '',
    touchupRequired: false, touchupCount: '', touchupAmount: '',
    extraSareeDrapes: false, sareeDrapesCount: '', sareeDrapesAmount: '',
    waitingRequired: false, waitingHours: '', waitingAmount: '',
    extraMakeup: false, extraMakeupCount: '', extraMakeupAmount: '',
    extraHairdo: false, extraHairdoCount: '', extraHairdoAmount: '',
  });

  const [showEventTypePicker, setShowEventTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());
  const [timeValue, setTimeValue] = useState(new Date());

  useEffect(() => { fetchEvent(); }, []);

  const fetchEvent = async () => {
    try {
      const result = await getEventById(eventId);
      if (result.success) {
        const e = result.data;
        setForm({
          clientName: e.clientName || '',
          clientPhone: e.clientPhone || '',
          alternativePhone: e.alternativePhone || '',
          emailAddress: e.emailAddress || '',
          eventType: e.eventType || EVENT_TYPES[0],
          eventDate: e.eventDate || '',
          eventTime: e.eventTime || '',
          country: e.country || '',
          state: e.state || '',
          city: e.city || '',
          buildingName: e.buildingName || '',
          address: e.address || '',
          typeOfMakeup: e.typeOfMakeup || '',
          packageAmount: e.packageAmount ? String(e.packageAmount) : '',
          advancePaid: e.advancePaid ? String(e.advancePaid) : '',
          notes: e.notes || '',
          workLocationDifferent: !!e.workLocationDifferent,
          workCountry: e.workCountry || '',
          workState: e.workState || '',
          workCity: e.workCity || '',
          workBuildingName: e.workBuildingName || '',
          workAddress: e.workAddress || '',
          touchupRequired: !!e.touchupRequired,
          touchupCount: e.touchupCount ? String(e.touchupCount) : '',
          touchupAmount: e.touchupAmount ? String(e.touchupAmount) : '',
          extraSareeDrapes: !!e.extraSareeDrapes,
          sareeDrapesCount: e.sareeDrapesCount ? String(e.sareeDrapesCount) : '',
          sareeDrapesAmount: e.sareeDrapesAmount ? String(e.sareeDrapesAmount) : '',
          waitingRequired: !!e.waitingRequired,
          waitingHours: e.waitingHours ? String(e.waitingHours) : '',
          waitingAmount: e.waitingAmount ? String(e.waitingAmount) : '',
          extraMakeup: !!e.extraMakeup,
          extraMakeupCount: e.extraMakeupCount ? String(e.extraMakeupCount) : '',
          extraMakeupAmount: e.extraMakeupAmount ? String(e.extraMakeupAmount) : '',
          extraHairdo: !!e.extraHairdo,
          extraHairdoCount: e.extraHairdoCount ? String(e.extraHairdoCount) : '',
          extraHairdoAmount: e.extraHairdoAmount ? String(e.extraHairdoAmount) : '',
        });
        if (e.eventDate) { try { setDateValue(new Date(e.eventDate)); } catch {} }
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load event.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const statesList = useMemo(() => STATES_BY_COUNTRY[form.country] || [], [form.country]);

  const pkg = parseFloat(form.packageAmount) || 0;
  const adv = parseFloat(form.advancePaid) || 0;
  const extrasTotal =
    (parseFloat(form.touchupAmount) || 0) +
    (parseFloat(form.sareeDrapesAmount) || 0) +
    (parseFloat(form.waitingAmount) || 0) +
    (parseFloat(form.extraMakeupAmount) || 0) +
    (parseFloat(form.extraHairdoAmount) || 0);
  const totalAmount = pkg + extrasTotal;
  const balance = Math.max(totalAmount - adv, 0);

  const eventMapsUrl = generateMapsUrl({ building: form.buildingName, city: form.city, state: form.state, country: form.country });
  const workMapsUrl = generateMapsUrl({ building: form.workBuildingName, city: form.city, state: form.state, country: form.country });

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') { setShowDatePicker(false); return; }
    if (selectedDate) {
      setDateValue(selectedDate);
      updateField('eventDate', selectedDate.toISOString().split('T')[0]);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed') { setShowTimePicker(false); return; }
    if (selectedTime) {
      setTimeValue(selectedTime);
      const hours = selectedTime.getHours();
      const mins = selectedTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 || 12;
      const m = mins.toString().padStart(2, '0');
      updateField('eventTime', `${h}:${m} ${ampm}`);
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const handleSave = async () => {
    if (!form.clientName.trim()) { Alert.alert('Required', 'Please enter the client name.'); return; }
    if (!form.eventType) { Alert.alert('Required', 'Please select an event type.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        packageAmount: pkg, advancePaid: adv,
        locationDirection: eventMapsUrl,
        workLocationDirection: workMapsUrl,
        touchupRequired: form.touchupRequired ? 1 : 0,
        touchupCount: parseInt(form.touchupCount) || 0,
        touchupAmount: parseFloat(form.touchupAmount) || 0,
        extraSareeDrapes: form.extraSareeDrapes ? 1 : 0,
        sareeDrapesCount: parseInt(form.sareeDrapesCount) || 0,
        sareeDrapesAmount: parseFloat(form.sareeDrapesAmount) || 0,
        waitingRequired: form.waitingRequired ? 1 : 0,
        waitingHours: parseFloat(form.waitingHours) || 0,
        waitingAmount: parseFloat(form.waitingAmount) || 0,
        extraMakeup: form.extraMakeup ? 1 : 0,
        extraMakeupCount: parseInt(form.extraMakeupCount) || 0,
        extraMakeupAmount: parseFloat(form.extraMakeupAmount) || 0,
        extraHairdo: form.extraHairdo ? 1 : 0,
        extraHairdoCount: parseInt(form.extraHairdoCount) || 0,
        extraHairdoAmount: parseFloat(form.extraHairdoAmount) || 0,
        workLocationDifferent: form.workLocationDifferent ? 1 : 0,
      };
      const result = await updateEvent(eventId, payload);
      if (result.success) {
        Alert.alert('Saved', 'Event updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update event.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const renderExtraService = (svcKey, boolField, countField, amountField, countLabel, amountLabel) => {
    const svc = EXTRA_SERVICES.find((s) => s.key === svcKey);
    const isActive = form[boolField];
    return (
      <View key={svcKey} style={styles.extraItem}>
        <TouchableOpacity
          style={[styles.checkboxRow, isActive && styles.checkboxRowActive, { backgroundColor: isActive ? C.primaryLight : C.inputBg, borderColor: isActive ? C.primary : C.border }]}
          onPress={() => updateField(boolField, !isActive)}
          activeOpacity={0.7}
        >
          <Ionicons name={isActive ? 'checkbox' : 'square-outline'} size={22} color={isActive ? C.primary : C.textMuted} />
          <Text style={[styles.checkboxLabel, isActive && styles.checkboxLabelActive]}>{svc?.label || svcKey}</Text>
        </TouchableOpacity>
        {isActive && (
          <View style={styles.miniForm}>
            <View style={styles.miniFormRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.miniLabel, { color: C.textSecondary }]}>{countLabel}</Text>
                <TextInput style={[styles.miniInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]} placeholder="0" placeholderTextColor={C.textMuted} value={form[countField]} onChangeText={(v) => updateField(countField, v)} keyboardType="numeric" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.miniLabel, { color: C.textSecondary }]}>{amountLabel}</Text>
                <TextInput style={[styles.miniInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]} placeholder="₹ 0" placeholderTextColor={C.textMuted} value={form[amountField]} onChangeText={(v) => updateField(amountField, v)} keyboardType="numeric" />
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderLocationFields = (prefix, statesData, mapsUrl, minimal = false) => {
    const cField = prefix ? `${prefix}Country` : 'country';
    const sField = prefix ? `${prefix}State` : 'state';
    const ciField = prefix ? `${prefix}City` : 'city';
    const bField = prefix ? `${prefix}BuildingName` : 'buildingName';
    const aField = prefix ? `${prefix}Address` : 'address';
    return (
      <>
        {!minimal && (
          <>
            <Text style={[styles.label, { color: C.textSecondary }]}>Country</Text>
            <AutocompleteInput value={form[cField]} onChangeText={(v) => { updateField(cField, v); updateField(sField, ''); }} data={COUNTRIES} placeholder="Search country..." colors={AC} />

            <Text style={[styles.label, { color: C.textSecondary }]}>State</Text>
            <AutocompleteInput value={form[sField]} onChangeText={(v) => updateField(sField, v)} data={statesData} placeholder={statesData.length > 0 ? 'Search state...' : 'Type state name'} colors={AC} />

            <Text style={[styles.label, { color: C.textSecondary }]}>City</Text>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="e.g. Chennai" placeholderTextColor={C.textMuted} value={form[ciField]} onChangeText={(v) => updateField(ciField, v)} />
          </>
        )}

        <Text style={[styles.label, { color: C.textSecondary }]}>Building / Venue Name</Text>
        <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="e.g. The Grand Palace" placeholderTextColor={C.textMuted} value={form[bField]} onChangeText={(v) => updateField(bField, v)} />

        {mapsUrl ? (
          <TouchableOpacity style={[styles.mapsLink, { backgroundColor: C.infoLight }]} onPress={() => Linking.openURL(mapsUrl)} activeOpacity={0.7}>
            <Ionicons name="navigate" size={16} color={C.info} />
            <Text style={[styles.mapsLinkText, { color: C.info }]}>Open in Google Maps</Text>
            <Ionicons name="open-outline" size={14} color={C.info} />
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.label, { color: C.textSecondary }]}>Address</Text>
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="Full address" placeholderTextColor={C.textMuted} value={form[aField]} onChangeText={(v) => updateField(aField, v)} multiline numberOfLines={3} />
      </>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: C.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>

        {/* ── Client Info ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="person" iconColor={C.sectionClient} title="Client Information" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Client Name *</Text>
          <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} value={form.clientName} onChangeText={(v) => updateField('clientName', v)} placeholder="Client name" placeholderTextColor={C.textMuted} />
          <Text style={[styles.label, { color: C.textSecondary }]}>Phone Number</Text>
          <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} value={form.clientPhone} onChangeText={(v) => updateField('clientPhone', v)} placeholder="Phone" placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Alternative Number</Text>
          <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} value={form.alternativePhone} onChangeText={(v) => updateField('alternativePhone', v)} placeholder="Optional" placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Email Address</Text>
          <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} value={form.emailAddress} onChangeText={(v) => updateField('emailAddress', v)} placeholder="email@example.com" placeholderTextColor={C.textMuted} keyboardType="email-address" autoCapitalize="none" />
        </View>

        {/* ── Event Details ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="sparkles" iconColor={C.sectionEvent} title="Event Details" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Event Type *</Text>
          <TouchableOpacity
            style={[styles.dateBtn, showEventTypePicker && styles.dateBtnActive, { backgroundColor: C.inputBg, borderColor: C.borderLight }]}
            onPress={() => setShowEventTypePicker(!showEventTypePicker)}
          >
            <Ionicons name="ribbon" size={20} color={showEventTypePicker ? C.primary : C.accent} />
            <Text style={[styles.eventTypeBtnText, { color: C.text }]}>{form.eventType}</Text>
            <Ionicons name={showEventTypePicker ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
          </TouchableOpacity>
          {showEventTypePicker && (
            <View style={[styles.pickerInline, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
              <Picker
                selectedValue={form.eventType}
                onValueChange={(v) => updateField('eventType', v)}
                style={styles.eventTypeSpinner}
                itemStyle={styles.eventTypeSpinnerItem}
              >
                {EVENT_TYPES.map((t) => (
                  <Picker.Item key={t} label={t} value={t} />
                ))}
              </Picker>
              <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowEventTypePicker(false)}>
                <Text style={[styles.pickerDoneText, { color: C.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.label, { color: C.textSecondary }]}>Date of Event</Text>
          <TouchableOpacity style={[styles.dateBtn, showDatePicker && styles.dateBtnActive, { backgroundColor: C.inputBg, borderColor: C.borderLight }]} onPress={() => setShowDatePicker(!showDatePicker)}>
            <Ionicons name="calendar" size={20} color={showDatePicker ? C.primary : C.accent} />
            <Text style={[styles.dateBtnText, { color: C.text }, !form.eventDate && { color: C.textMuted }]}>{form.eventDate ? formatDisplayDate(form.eventDate) : 'Select date'}</Text>
            <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
          </TouchableOpacity>
          {showDatePicker && (
            <View style={[styles.pickerInline, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
              <DateTimePicker value={dateValue} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={onDateChange} accentColor={C.primary} />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.pickerDoneText, { color: C.primary }]}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={[styles.label, { color: C.textSecondary }]}>Makeup Start Time</Text>
          <TouchableOpacity style={[styles.dateBtn, showTimePicker && styles.dateBtnActive, { backgroundColor: C.inputBg, borderColor: C.borderLight }]} onPress={() => setShowTimePicker(!showTimePicker)}>
            <Ionicons name="time" size={20} color={showTimePicker ? C.primary : C.accent} />
            <Text style={[styles.dateBtnText, { color: C.text }, !form.eventTime && { color: C.textMuted }]}>{form.eventTime || 'Select time'}</Text>
            <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
          </TouchableOpacity>
          {showTimePicker && (
            <View style={[styles.pickerInline, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
              <DateTimePicker value={timeValue} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} accentColor={C.primary} />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.pickerDoneText, { color: C.primary }]}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Event Location ── */}
        <View style={[styles.section, { zIndex: 20, backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="location" iconColor={C.sectionLocation} title="Event Location" />
          {renderLocationFields('', statesList, eventMapsUrl)}
          <View style={[styles.workToggleRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.workToggleLabel, { color: C.text }]}>Work location different from event?</Text>
              <Text style={[styles.workToggleHint, { color: C.textMuted }]}>Enable if the makeup venue / building is different</Text>
            </View>
            <Switch value={form.workLocationDifferent} onValueChange={(v) => updateField('workLocationDifferent', v)} trackColor={{ false: C.border, true: C.primaryMuted }} thumbColor={form.workLocationDifferent ? C.primary : '#f4f3f4'} />
          </View>
        </View>

        {form.workLocationDifferent && (
          <View style={[styles.section, styles.workSection, { zIndex: 15, backgroundColor: C.surface }]}>
            <SectionHeader icon="briefcase" iconColor={C.sectionLocation} title="Work Location" />
            {renderLocationFields('work', [], workMapsUrl, true)}
          </View>
        )}

        {/* ── Makeup & Pricing ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="color-palette" iconColor={C.sectionPricing} title="Makeup & Pricing" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Type of Makeup</Text>
          <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} value={form.typeOfMakeup} onChangeText={(v) => updateField('typeOfMakeup', v)} placeholder="e.g. HD Bridal" placeholderTextColor={C.textMuted} />
          <Text style={[styles.label, { color: C.textSecondary }]}>Package Amount (₹)</Text>
          <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} value={form.packageAmount} onChangeText={(v) => updateField('packageAmount', v)} placeholder="Amount" placeholderTextColor={C.textMuted} keyboardType="numeric" />
          <Text style={[styles.label, { color: C.textSecondary }]}>Advance Paid (₹)</Text>
          <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} value={form.advancePaid} onChangeText={(v) => updateField('advancePaid', v)} placeholder="Advance" placeholderTextColor={C.textMuted} keyboardType="numeric" />
        </View>

        {/* ── Extra Services ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="add-circle" iconColor={C.sectionExtras} title="Extra Services" />
          <Text style={[styles.sectionHint, { color: C.textMuted }]}>Select any additional services for this event</Text>
          {renderExtraService('touchup', 'touchupRequired', 'touchupCount', 'touchupAmount', 'Number of Touchups', 'Amount (₹)')}
          {renderExtraService('sareeDrapes', 'extraSareeDrapes', 'sareeDrapesCount', 'sareeDrapesAmount', 'Number of Drapes', 'Amount (₹)')}
          {renderExtraService('waiting', 'waitingRequired', 'waitingHours', 'waitingAmount', 'Hours of Waiting', 'Amount (₹)')}
          {renderExtraService('extraMakeup', 'extraMakeup', 'extraMakeupCount', 'extraMakeupAmount', 'Number of Makeups', 'Amount (₹)')}
          {renderExtraService('extraHairdo', 'extraHairdo', 'extraHairdoCount', 'extraHairdoAmount', 'Number of Hairdos', 'Amount (₹)')}
        </View>

        {/* ── Balance Summary ── */}
        <View style={[styles.balanceCard, { backgroundColor: C.surface }]}>
          <View style={styles.balanceSummaryRow}>
            <Text style={[styles.balanceSummaryLabel, { color: C.textSecondary }]}>Package</Text>
            <Text style={[styles.balanceSummaryValue, { color: C.text }]}>₹{pkg.toLocaleString('en-IN')}</Text>
          </View>
          {extrasTotal > 0 && (
            <View style={styles.balanceSummaryRow}>
              <Text style={[styles.balanceSummaryLabel, { color: C.textSecondary }]}>Extras</Text>
              <Text style={[styles.balanceSummaryValue, { color: C.text }]}>+ ₹{extrasTotal.toLocaleString('en-IN')}</Text>
            </View>
          )}
          <View style={styles.balanceSummaryRow}>
            <Text style={[styles.balanceSummaryLabel, { color: C.textSecondary }]}>Advance</Text>
            <Text style={[styles.balanceSummaryValue, { color: C.success }]}>− ₹{adv.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.balanceDivider, { backgroundColor: C.border }]} />
          <View style={styles.balanceSummaryRow}>
            <Text style={[styles.balanceTotalLabel, { color: C.text }]}>Balance to Pay</Text>
            <Text style={styles.balanceTotalValue}>₹{balance.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="document-text" iconColor={C.sectionNotes} title="Notes" />
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="Any additional notes..." placeholderTextColor={C.textMuted} value={form.notes} onChangeText={(v) => updateField('notes', v)} multiline numberOfLines={3} />
        </View>

        {/* ── Save ── */}
        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled, { backgroundColor: C.primary }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <View style={styles.saveBtnInner}>
              <Ionicons name="checkmark-circle" size={22} color={C.white} />
              <Text style={styles.saveButtonText}>Update Event</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  scrollContent: { padding: 16 },
  section: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  workSection: { borderColor: COLORS.info, borderWidth: 1.5 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  iconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, letterSpacing: 0.2 },
  sectionHint: { fontSize: 13, color: COLORS.textMuted, marginBottom: 12, marginTop: -6 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  eventTypeBtnText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  eventTypeSpinner: { height: 180 },
  eventTypeSpinnerItem: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  dateBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  dateBtnText: { flex: 1, fontSize: 15, color: COLORS.text },
  pickerInline: { marginTop: 8, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden', paddingBottom: 4 },
  pickerDoneBtn: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 10 },
  pickerDoneText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  mapsLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: COLORS.infoLight, borderRadius: 10, alignSelf: 'flex-start' },
  mapsLinkText: { fontSize: 13, color: COLORS.info, fontWeight: '600' },
  workToggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 14, backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  workToggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  workToggleHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  extraItem: { marginBottom: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border },
  checkboxRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  checkboxLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  checkboxLabelActive: { fontWeight: '700', color: COLORS.primary },
  miniForm: { marginTop: 6, marginLeft: 16, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: COLORS.primaryMuted },
  miniFormRow: { flexDirection: 'row' },
  miniLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  miniInput: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  balanceCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: COLORS.accent, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  balanceSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  balanceSummaryLabel: { fontSize: 14, color: COLORS.textSecondary },
  balanceSummaryValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  balanceDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  balanceTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  balanceTotalValue: { fontSize: 22, fontWeight: '800', color: COLORS.accent },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 18, alignItems: 'center', shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveButtonDisabled: { opacity: 0.6 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});
