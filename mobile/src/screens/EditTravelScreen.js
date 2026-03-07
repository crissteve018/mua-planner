import React, { useState, useEffect, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { getTravelById, updateTravel } from '../api/travel';
import { COLORS, TRAVEL_MODES } from '../constants';
import { useTheme } from '../context/SettingsContext';
import { CITIES_BY_COUNTRY } from '../constants/locations';
import AutocompleteInput from '../components/AutocompleteInput';

/* ── helpers ─────────────────────────────────── */
const formatDate = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};
const toISODate = (date) => date.toISOString().split('T')[0];

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

/* ─────────────────────────────────────────────── */
export default function EditTravelScreen({ navigation, route }) {
  const C = useTheme();
  const acColors = {
    bg: C.inputBg, text: C.text, textLight: C.textMuted,
    border: C.borderLight, primary: C.primary, surface: C.surface,
  };
  const { travelId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [eventCountry, setEventCountry] = useState('');

  const [form, setForm] = useState({
    travelMode: 'flight',
    travelDate: '',
    returnDate: '',
    totalCost: '',
    notes: '',
    numTravellers: '1',
    bookedByArtist: false,
    ticketUri: '',
    departureCity: '', arrivalCity: '', airlineName: '',
    trainNumber: '', trainName: '', departureStation: '', arrivalStation: '',
    cabProvider: '', pickupLocation: '', dropLocation: '', estimatedFare: '', driverContact: '',
    startingLocation: '', destination: '', distance: '', fuelCost: '', tollCharges: '', parkingCharges: '',
    busOperator: '', departureLocation: '', arrivalLocation: '',
  });

  /* ── load existing data ─────────────────────── */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await getTravelById(travelId);
          if (res.success) {
            const r = res.data;
            setEventCountry(r.country || '');
            setForm({
              travelMode: r.travelMode || 'flight',
              travelDate: r.travelDate || '',
              returnDate: r.returnDate || '',
              totalCost: r.totalCost ? String(r.totalCost) : '',
              notes: r.notes || '',
              numTravellers: r.numTravellers ? String(r.numTravellers) : '1',
              bookedByArtist: !!(r.bookedByArtist),
              ticketUri: r.attachmentPath || '',
              departureCity: r.departureCity || '',
              arrivalCity: r.arrivalCity || '',
              airlineName: r.airlineName || '',
              trainNumber: r.trainNumber || '',
              trainName: r.trainName || '',
              departureStation: r.departureStation || '',
              arrivalStation: r.arrivalStation || '',
              cabProvider: r.cabProvider || '',
              pickupLocation: r.pickupLocation || '',
              dropLocation: r.dropLocation || '',
              estimatedFare: r.estimatedFare ? String(r.estimatedFare) : '',
              driverContact: r.driverContact || '',
              startingLocation: r.startingLocation || '',
              destination: r.destination || '',
              distance: r.distance ? String(r.distance) : '',
              fuelCost: r.fuelCost ? String(r.fuelCost) : '',
              tollCharges: r.tollCharges ? String(r.tollCharges) : '',
              parkingCharges: r.parkingCharges ? String(r.parkingCharges) : '',
              busOperator: r.busOperator || '',
              departureLocation: r.departureLocation || '',
              arrivalLocation: r.arrivalLocation || '',
            });
          }
        } catch (err) {
          console.error('Error loading travel:', err);
        } finally {
          setLoading(false);
        }
      })();
    }, [travelId])
  );

  /* ── auto-compute own car total ─────────────── */
  useEffect(() => {
    if (form.travelMode === 'own_car') {
      const fuel = parseFloat(form.fuelCost) || 0;
      const toll = parseFloat(form.tollCharges) || 0;
      const park = parseFloat(form.parkingCharges) || 0;
      setForm(prev => ({ ...prev, totalCost: String(fuel + toll + park) }));
    }
  }, [form.fuelCost, form.tollCharges, form.parkingCharges, form.travelMode]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const closeDatePicker = () => setShowDatePicker(null);

  const toggleDatePicker = (which) => {
    setShowDatePicker(prev => prev === which ? null : which);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(null);
    if (event.type === 'dismissed') { setShowDatePicker(null); return; }
    if (!selectedDate) return;
    const field = showDatePicker === 'return' ? 'returnDate' : 'travelDate';
    set(field, toISODate(selectedDate));
    if (Platform.OS === 'ios') setShowDatePicker(null);
  };

  /* ── city data ──────────────────────────────── */
  const getCities = () => {
    if (!eventCountry) return [];
    return CITIES_BY_COUNTRY[eventCountry] || [];
  };

  /* ── file/image picker for ticket ───────────── */
  const handlePickTicket = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to files to attach tickets.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets?.length > 0) {
      set('ticketUri', result.assets[0].uri);
    }
  };

  /* ── reusable sub-components ────────────────── */
  const TravellerStepper = () => (
    <>
      <Text style={[styles.label, { color: C.textSecondary }]}>Number of Travellers</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => {
            const cur = parseInt(form.numTravellers, 10) || 1;
            if (cur > 1) set('numTravellers', String(cur - 1));
          }}
        >
          <Ionicons name="remove" size={20} color={C.primary} />
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: C.text }]}>{form.numTravellers || '1'}</Text>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => {
            const cur = parseInt(form.numTravellers, 10) || 1;
            set('numTravellers', String(cur + 1));
          }}
        >
          <Ionicons name="add" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>
    </>
  );

  const DateBtn = ({ which, label, placeholder: ph }) => (
    <>
      <Text style={[styles.label, { color: C.textSecondary }]}>{label}</Text>
      <TouchableOpacity style={[styles.dateBtn, { backgroundColor: C.inputBg, borderColor: C.borderLight }]} onPress={() => toggleDatePicker(which)}>
        <Ionicons name="calendar-outline" size={18} color={C.primary} />
        <Text style={[styles.dateBtnText, { color: C.text }, !form[which === 'return' ? 'returnDate' : 'travelDate'] && { color: C.textMuted }]}>
          {form[which === 'return' ? 'returnDate' : 'travelDate']
            ? formatDate(form[which === 'return' ? 'returnDate' : 'travelDate'])
            : ph}
        </Text>
      </TouchableOpacity>
    </>
  );

  const TicketAttach = () => (
    <>
      <Text style={[styles.label, { color: C.textSecondary }]}>Attach Ticket</Text>
      <TouchableOpacity style={[styles.ticketBtn, { backgroundColor: C.inputBg, borderColor: C.borderLight }]} onPress={handlePickTicket}>
        {form.ticketUri ? (
          <View style={styles.ticketPreview}>
            <Image source={{ uri: form.ticketUri }} style={[styles.ticketThumb, { backgroundColor: C.borderLight }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ticketAttachedText, { color: C.success }]}>File attached</Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>Tap to change</Text>
            </View>
            <TouchableOpacity onPress={() => set('ticketUri', '')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={C.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ticketEmpty}>
            <Ionicons name="document-attach" size={20} color={C.primary} />
            <Text style={[styles.ticketEmptyText, { color: C.primary }]}>Choose File / Image</Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );

  const InlineDatePicker = () => {
    if (!showDatePicker) return null;
    return (
      <DateTimePicker
        value={
          showDatePicker === 'return' && form.returnDate
            ? new Date(form.returnDate)
            : form.travelDate
              ? new Date(form.travelDate)
              : new Date()
        }
        mode="date"
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        onChange={handleDateChange}
        themeVariant="light"
      />
    );
  };

  /* ── save ────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        travelMode: form.travelMode,
        travelDate: form.travelDate,
        returnDate: form.returnDate,
        totalCost: parseFloat(form.totalCost) || 0,
        notes: form.notes,
        numTravellers: parseInt(form.numTravellers, 10) || 1,
        bookedByArtist: form.bookedByArtist ? 1 : 0,
        attachmentPath: form.ticketUri,
        departureCity: form.departureCity,
        arrivalCity: form.arrivalCity,
        airlineName: form.airlineName,
        trainNumber: form.trainNumber,
        trainName: form.trainName,
        departureStation: form.departureStation,
        arrivalStation: form.arrivalStation,
        cabProvider: form.cabProvider,
        pickupLocation: form.pickupLocation,
        dropLocation: form.dropLocation,
        estimatedFare: parseFloat(form.estimatedFare) || 0,
        driverContact: form.driverContact,
        startingLocation: form.startingLocation,
        destination: form.destination,
        distance: parseFloat(form.distance) || 0,
        fuelCost: parseFloat(form.fuelCost) || 0,
        tollCharges: parseFloat(form.tollCharges) || 0,
        parkingCharges: parseFloat(form.parkingCharges) || 0,
        busOperator: form.busOperator,
        departureLocation: form.departureLocation,
        arrivalLocation: form.arrivalLocation,
      };

      const res = await updateTravel(travelId, payload);
      if (res.success) {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update travel');
    } finally {
      setSaving(false);
    }
  };

  /* ── mode-specific form fields ──────────────── */
  const renderModeFields = () => {
    const cities = getCities();

    switch (form.travelMode) {
      case 'flight':
        return (
          <>
            <SectionHeader icon="airplane" color={C.sectionFlight} title="Flight Details" />
            <View style={[styles.row, { zIndex: 20 }]}>
              <View style={[styles.halfField, { zIndex: 21 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>From (City)</Text>
                <AutocompleteInput
                  value={form.departureCity}
                  onChangeText={v => set('departureCity', v)}
                  data={cities}
                  placeholder="Departure city"
                  colors={acColors}
                  onInputFocus={closeDatePicker}
                />
              </View>
              <View style={[styles.halfField, { zIndex: 20 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>To (City)</Text>
                <AutocompleteInput
                  value={form.arrivalCity}
                  onChangeText={v => set('arrivalCity', v)}
                  data={cities}
                  placeholder="Arrival city"
                  colors={acColors}
                  onInputFocus={closeDatePicker}
                />
              </View>
            </View>
            <Text style={[styles.label, { color: C.textSecondary }]}>Airline Name</Text>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="e.g. IndiGo, Air India" placeholderTextColor={C.textMuted} value={form.airlineName} onChangeText={v => set('airlineName', v)} onFocus={closeDatePicker} />
            <TravellerField />
            <DateBtn which="travel" label="Travel Date" placeholder="Select date" />
            <DateBtn which="return" label="Return Date" placeholder="Select date (optional)" />
            <InlineDatePicker />
            <TicketAttach />
          </>
        );

      case 'train':
        return (
          <>
            <SectionHeader icon="train" color={C.sectionTrain} title="Train Details" />
            <View style={[styles.row, { zIndex: 20 }]}>
              <View style={[styles.halfField, { zIndex: 21 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>From (City)</Text>
                <AutocompleteInput value={form.departureCity} onChangeText={v => set('departureCity', v)} data={cities} placeholder="Departure city" colors={acColors} onInputFocus={closeDatePicker} />
              </View>
              <View style={[styles.halfField, { zIndex: 20 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>To (City)</Text>
                <AutocompleteInput value={form.arrivalCity} onChangeText={v => set('arrivalCity', v)} data={cities} placeholder="Arrival city" colors={acColors} onInputFocus={closeDatePicker} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Train Number</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="e.g. 12345" placeholderTextColor={C.textMuted} value={form.trainNumber} onChangeText={v => set('trainNumber', v)} onFocus={closeDatePicker} />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Train Name</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="e.g. Rajdhani" placeholderTextColor={C.textMuted} value={form.trainName} onChangeText={v => set('trainName', v)} onFocus={closeDatePicker} />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>From (Station)</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="Departure station" placeholderTextColor={C.textMuted} value={form.departureStation} onChangeText={v => set('departureStation', v)} onFocus={closeDatePicker} />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>To (Station)</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="Arrival station" placeholderTextColor={C.textMuted} value={form.arrivalStation} onChangeText={v => set('arrivalStation', v)} onFocus={closeDatePicker} />
              </View>
            </View>
            <TravellerField />
            <DateBtn which="travel" label="Travel Date" placeholder="Select date" />
            <DateBtn which="return" label="Return Date" placeholder="Select date (optional)" />
            <InlineDatePicker />
            <TicketAttach />
          </>
        );

      case 'cab':
        return (
          <>
            <SectionHeader icon="car-sport" color={C.sectionCab} title="Cab Details" />
            <View style={[styles.row, { zIndex: 20 }]}>
              <View style={[styles.halfField, { zIndex: 21 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Pickup City</Text>
                <AutocompleteInput value={form.pickupLocation} onChangeText={v => set('pickupLocation', v)} data={cities} placeholder="From" colors={acColors} onInputFocus={closeDatePicker} />
              </View>
              <View style={[styles.halfField, { zIndex: 20 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Drop City</Text>
                <AutocompleteInput value={form.dropLocation} onChangeText={v => set('dropLocation', v)} data={cities} placeholder="To" colors={acColors} onInputFocus={closeDatePicker} />
              </View>
            </View>
            <Text style={[styles.label, { color: C.textSecondary }]}>Cab Provider</Text>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="e.g. Uber, Ola" placeholderTextColor={C.textMuted} value={form.cabProvider} onChangeText={v => set('cabProvider', v)} onFocus={closeDatePicker} />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Estimated Fare (₹)</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.estimatedFare} onChangeText={v => set('estimatedFare', v)} onFocus={closeDatePicker} />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Driver Contact</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="Phone number" placeholderTextColor={C.textMuted} keyboardType="phone-pad" value={form.driverContact} onChangeText={v => set('driverContact', v)} onFocus={closeDatePicker} />
              </View>
            </View>
            <TravellerField />
            <DateBtn which="travel" label="Travel Date" placeholder="Select date" />
            <InlineDatePicker />
            <TicketAttach />
          </>
        );

      case 'own_car':
        return (
          <>
            <SectionHeader icon="car" color={C.sectionCar} title="Own Car Details" />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Starting Location</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="From" placeholderTextColor={C.textMuted} value={form.startingLocation} onChangeText={v => set('startingLocation', v)} onFocus={closeDatePicker} />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Destination</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="To" placeholderTextColor={C.textMuted} value={form.destination} onChangeText={v => set('destination', v)} onFocus={closeDatePicker} />
              </View>
            </View>
            <DateBtn which="travel" label="Travel Date" placeholder="Select date" />
            <InlineDatePicker />

            <SectionHeader icon="speedometer" color={C.info} title="Distance" />
            <Text style={[styles.label, { color: C.textSecondary }]}>Distance (km)</Text>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.distance} onChangeText={v => set('distance', v)} onFocus={closeDatePicker} />

            <SectionHeader icon="wallet" color={C.sectionPricing} title="Car Expenses" />
            <View style={styles.row}>
              <View style={styles.thirdField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Fuel (₹)</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.fuelCost} onChangeText={v => set('fuelCost', v)} onFocus={closeDatePicker} />
              </View>
              <View style={styles.thirdField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Tolls (₹)</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.tollCharges} onChangeText={v => set('tollCharges', v)} onFocus={closeDatePicker} />
              </View>
              <View style={styles.thirdField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Parking (₹)</Text>
                <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.parkingCharges} onChangeText={v => set('parkingCharges', v)} onFocus={closeDatePicker} />
              </View>
            </View>
            {/* Total Travel Cost (auto-calculated) */}
            <SectionHeader icon="calculator" color={C.success} title="Total Travel Cost" />
            <View style={styles.autoTotalCard}>
              <Text style={styles.autoTotalAmount}>
                ₹{((parseFloat(form.fuelCost) || 0) + (parseFloat(form.tollCharges) || 0) + (parseFloat(form.parkingCharges) || 0)).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.autoTotalHint}>Fuel + Tolls + Parking</Text>
            </View>
          </>
        );

      case 'bus':
        return (
          <>
            <SectionHeader icon="bus" color={C.sectionBus} title="Bus Details" />
            <View style={[styles.row, { zIndex: 20 }]}>
              <View style={[styles.halfField, { zIndex: 21 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>From (City)</Text>
                <AutocompleteInput value={form.departureLocation} onChangeText={v => set('departureLocation', v)} data={cities} placeholder="Departure city" colors={acColors} onInputFocus={closeDatePicker} />
              </View>
              <View style={[styles.halfField, { zIndex: 20 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>To (City)</Text>
                <AutocompleteInput value={form.arrivalLocation} onChangeText={v => set('arrivalLocation', v)} data={cities} placeholder="Arrival city" colors={acColors} onInputFocus={closeDatePicker} />
              </View>
            </View>
            <Text style={[styles.label, { color: C.textSecondary }]}>Bus Operator</Text>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="e.g. RedBus, KSRTC" placeholderTextColor={C.textMuted} value={form.busOperator} onChangeText={v => set('busOperator', v)} onFocus={closeDatePicker} />
            <TravellerField />
            <DateBtn which="travel" label="Travel Date" placeholder="Select date" />
            <DateBtn which="return" label="Return Date" placeholder="Select date (optional)" />
            <InlineDatePicker />
            <TicketAttach />
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Close button header */}
      <View style={styles.closeHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* ── Travel Mode ──────────────────── */}
        <SectionHeader icon="navigate" color={C.sectionTravel} title="Travel Mode" />
        <View style={styles.modeGrid}>
          {TRAVEL_MODES.map(m => {
            const isActive = form.travelMode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeChip, { backgroundColor: C.surface, borderColor: C.border }, isActive && { backgroundColor: m.color, borderColor: m.color }]}
                onPress={() => { set('travelMode', m.key); closeDatePicker(); }}
              >
                <Ionicons name={m.icon} size={18} color={isActive ? '#FFF' : m.color} />
                <Text style={[styles.modeChipText, { color: C.text }, isActive && { color: '#FFF' }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Mode-specific fields ─────────── */}
        {renderModeFields()}

        {/* ── Cost (non-own-car) ───────────── */}
        {form.travelMode !== 'own_car' && (
          <>
            <SectionHeader icon="wallet" color={C.sectionPricing} title="Cost" />
            <Text style={[styles.label, { color: C.textSecondary }]}>Total Cost (₹)</Text>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={form.totalCost} onChangeText={v => set('totalCost', v)} onFocus={closeDatePicker} />
          </>
        )}

        {/* ── Booked by Artist (not for own_car) ── */}
        {form.travelMode !== 'own_car' && (
          <TouchableOpacity
            style={[styles.checkboxRow, { backgroundColor: C.surface, borderColor: C.borderLight }]}
            onPress={() => set('bookedByArtist', !form.bookedByArtist)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, { borderColor: C.border }, form.bookedByArtist && [styles.checkboxActive, { backgroundColor: C.primary, borderColor: C.primary }]]}>
              {form.bookedByArtist && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkboxLabel, { color: C.text }]}>Booked by Artist</Text>
              <Text style={[styles.checkboxHint, { color: C.textSecondary }]}>Cost will be added to Event's due amount</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Notes ────────────────────────── */}
        <SectionHeader icon="document-text" color={C.sectionNotes} title="Notes" />
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
          placeholder="Any additional notes…"
          placeholderTextColor={C.textMuted}
          value={form.notes}
          onChangeText={v => set('notes', v)}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          onFocus={closeDatePicker}
        />

        {/* ── Save ─────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Update Travel</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ── styles ───────────────────────────────────── */
const styles = StyleSheet.create({
  closeHeader: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 6 : 10, paddingBottom: 2,
  },
  scroll: { paddingHorizontal: 18, paddingTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginLeft: 10 },

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  modeChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.borderLight,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  thirdField: { flex: 1 },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  dateBtnText: { fontSize: 15, color: COLORS.text },



  ticketBtn: {
    backgroundColor: COLORS.inputBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  ticketEmpty: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14,
  },
  ticketPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10,
  },
  ticketThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: COLORS.borderLight },
  ticketAttachedText: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  ticketEmptyText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  checkboxRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginTop: 14,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  checkbox: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  checkboxLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  checkboxHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  autoTotalCard: {
    backgroundColor: '#E8F5E9', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#C8E6C9',
  },
  autoTotalAmount: {
    fontSize: 24, fontWeight: '800', color: '#2E7D32',
  },
  autoTotalHint: {
    fontSize: 12, color: '#558B2F', marginTop: 4, fontWeight: '500',
  },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, marginTop: 28,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
