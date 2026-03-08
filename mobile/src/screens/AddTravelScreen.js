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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { getAllEvents } from '../api/events';
import { createTravel } from '../api/travel';
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

/* ── main component ───────────────────────────── */
export default function AddTravelScreen({ navigation, route }) {
  const C = useTheme();
  const acColors = {
    bg: C.inputBg, text: C.text, textLight: C.textMuted,
    border: C.borderLight, primary: C.primary, surface: C.surface,
  };
  const preselectedEventId = route.params?.eventId || null;
  const preselectedEventName = route.params?.eventName || null;

  // Event picker state
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(
    preselectedEventId ? {
      id: preselectedEventId,
      clientName: preselectedEventName || '',
      eventType: route.params?.eventType || '',
      eventDate: route.params?.eventDate || '',
      city: route.params?.eventCity || '',
    } : null
  );
  const [eventSearch, setEventSearch] = useState('');
  const [showEventPicker, setShowEventPicker] = useState(!preselectedEventId);

  // Form state
  const [form, setForm] = useState({
    travelMode: 'flight',
    travelDate: '',
    returnDate: '',
    totalCost: '',
    notes: '',
    numTravellers: '1',
    bookedByArtist: false,
    ticketUri: '',
    // Flight
    departureCity: '',
    arrivalCity: '',
    airlineName: '',
    // Train
    trainNumber: '',
    trainName: '',
    departureStation: '',
    arrivalStation: '',
    // Cab
    cabProvider: '',
    pickupLocation: '',
    dropLocation: '',
    estimatedFare: '',
    driverContact: '',
    // Own Car
    startingLocation: '',
    destination: '',
    distance: '',
    fuelCost: '',
    tollCharges: '',
    parkingCharges: '',
    // Bus
    busOperator: '',
    departureLocation: '',
    arrivalLocation: '',
  });

  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(null); // 'travel' | 'return' | null

  /* ── load events ────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await getAllEvents();
        if (res.success) {
          setEvents(res.data);
          if (preselectedEventId) {
            const ev = res.data.find(e => e.id === preselectedEventId);
            if (ev) setSelectedEvent(ev);
          }
        }
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, []);

  /* ── auto-compute own car total ─────────────── */
  useEffect(() => {
    if (form.travelMode === 'own_car') {
      const fuel = parseFloat(form.fuelCost) || 0;
      const toll = parseFloat(form.tollCharges) || 0;
      const park = parseFloat(form.parkingCharges) || 0;
      setForm(prev => ({ ...prev, totalCost: String(fuel + toll + park) }));
    }
  }, [form.fuelCost, form.tollCharges, form.parkingCharges, form.travelMode]);

  /* ── helpers ────────────────────────────────── */
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

  /* ── city data based on event country ───────── */
  const getCities = () => {
    if (!selectedEvent?.country) return [];
    return CITIES_BY_COUNTRY[selectedEvent.country] || [];
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

  /* ── travellers field ─────────────────────────── */
  const TravellerField = () => (
    <>
      <Text style={[styles.label, { color: C.textSecondary }]}>Number of Travellers</Text>
      <TextInput
        style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
        placeholder="1"
        placeholderTextColor={C.textMuted}
        keyboardType="numeric"
        value={form.numTravellers}
        onChangeText={v => set('numTravellers', v)}
        onFocus={closeDatePicker}
      />
    </>
  );

  /* ── date buttons (reusable) ────────────────── */
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

  /* ── ticket attach button ───────────────────── */
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

  /* ── inline date picker ─────────────────────── */
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
    if (!selectedEvent) {
      Alert.alert('Missing Event', 'Please select an event first.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        eventId: selectedEvent.id,
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

      const res = await createTravel(payload);
      if (res.success) {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save travel');
    } finally {
      setSaving(false);
    }
  };

  /* ── filtered event list ────────────────────── */
  const filteredEvents = events.filter(e => {
    if (!eventSearch) return true;
    const q = eventSearch.toLowerCase();
    return (
      e.clientName?.toLowerCase().includes(q) ||
      e.eventType?.toLowerCase().includes(q) ||
      e.city?.toLowerCase().includes(q)
    );
  });

  const renderEventItem = ({ item }) => {
    const isSelected = selectedEvent?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.eventPickerItem, { backgroundColor: C.surface, borderColor: C.borderLight }, isSelected && styles.eventPickerItemActive, isSelected && { borderColor: C.primary, backgroundColor: C.primaryLight }]}
        onPress={() => { setSelectedEvent(item); setShowEventPicker(false); }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.eventPickerName, { color: C.text }]}>{item.clientName}</Text>
          <Text style={[styles.eventPickerInfo, { color: C.textSecondary }]}>
            {item.eventType} • {formatDate(item.eventDate)}
            {item.city ? ` • ${item.city}` : ''}
          </Text>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
      </TouchableOpacity>
    );
  };

  /* ── mode-specific fields ───────────────────── */
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
            <TextInput
              style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
              placeholder="e.g. IndiGo, Air India"
              placeholderTextColor={C.textMuted}
              value={form.airlineName}
              onChangeText={v => set('airlineName', v)}
              onFocus={closeDatePicker}
            />
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
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Train Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="e.g. 12345"
                  placeholderTextColor={C.textMuted}
                  value={form.trainNumber}
                  onChangeText={v => set('trainNumber', v)}
                  onFocus={closeDatePicker}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Train Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="e.g. Rajdhani"
                  placeholderTextColor={C.textMuted}
                  value={form.trainName}
                  onChangeText={v => set('trainName', v)}
                  onFocus={closeDatePicker}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>From (Station)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="Departure station"
                  placeholderTextColor={C.textMuted}
                  value={form.departureStation}
                  onChangeText={v => set('departureStation', v)}
                  onFocus={closeDatePicker}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>To (Station)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="Arrival station"
                  placeholderTextColor={C.textMuted}
                  value={form.arrivalStation}
                  onChangeText={v => set('arrivalStation', v)}
                  onFocus={closeDatePicker}
                />
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
                <AutocompleteInput
                  value={form.pickupLocation}
                  onChangeText={v => set('pickupLocation', v)}
                  data={cities}
                  placeholder="From"
                  colors={acColors}
                  onInputFocus={closeDatePicker}
                />
              </View>
              <View style={[styles.halfField, { zIndex: 20 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Drop City</Text>
                <AutocompleteInput
                  value={form.dropLocation}
                  onChangeText={v => set('dropLocation', v)}
                  data={cities}
                  placeholder="To"
                  colors={acColors}
                  onInputFocus={closeDatePicker}
                />
              </View>
            </View>
            <Text style={[styles.label, { color: C.textSecondary }]}>Cab Provider</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
              placeholder="e.g. Uber, Ola"
              placeholderTextColor={C.textMuted}
              value={form.cabProvider}
              onChangeText={v => set('cabProvider', v)}
              onFocus={closeDatePicker}
            />
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Estimated Fare (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={form.estimatedFare}
                  onChangeText={v => set('estimatedFare', v)}
                  onFocus={closeDatePicker}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Driver Contact</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="Phone number"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  value={form.driverContact}
                  onChangeText={v => set('driverContact', v)}
                  onFocus={closeDatePicker}
                />
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
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="From"
                  placeholderTextColor={C.textMuted}
                  value={form.startingLocation}
                  onChangeText={v => set('startingLocation', v)}
                  onFocus={closeDatePicker}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Destination</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="To"
                  placeholderTextColor={C.textMuted}
                  value={form.destination}
                  onChangeText={v => set('destination', v)}
                  onFocus={closeDatePicker}
                />
              </View>
            </View>
            <DateBtn which="travel" label="Travel Date" placeholder="Select date" />
            <InlineDatePicker />

            {/* ── KM Section ── */}
            <SectionHeader icon="speedometer" color={C.info} title="Distance" />
            <Text style={[styles.label, { color: C.textSecondary }]}>Distance (km)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
              placeholder="0"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={form.distance}
              onChangeText={v => set('distance', v)}
              onFocus={closeDatePicker}
            />

            {/* ── Cost Section ── */}
            <SectionHeader icon="wallet" color={C.sectionPricing} title="Car Expenses" />
            <View style={styles.row}>
              <View style={styles.thirdField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Fuel (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={form.fuelCost}
                  onChangeText={v => set('fuelCost', v)}
                  onFocus={closeDatePicker}
                />
              </View>
              <View style={styles.thirdField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Tolls (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={form.tollCharges}
                  onChangeText={v => set('tollCharges', v)}
                  onFocus={closeDatePicker}
                />
              </View>
              <View style={styles.thirdField}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Parking (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={form.parkingCharges}
                  onChangeText={v => set('parkingCharges', v)}
                  onFocus={closeDatePicker}
                />
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
                <AutocompleteInput
                  value={form.departureLocation}
                  onChangeText={v => set('departureLocation', v)}
                  data={cities}
                  placeholder="Departure city"
                  colors={acColors}
                  onInputFocus={closeDatePicker}
                />
              </View>
              <View style={[styles.halfField, { zIndex: 20 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>To (City)</Text>
                <AutocompleteInput
                  value={form.arrivalLocation}
                  onChangeText={v => set('arrivalLocation', v)}
                  data={cities}
                  placeholder="Arrival city"
                  colors={acColors}
                  onInputFocus={closeDatePicker}
                />
              </View>
            </View>
            <Text style={[styles.label, { color: C.textSecondary }]}>Bus Operator</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
              placeholder="e.g. RedBus, KSRTC"
              placeholderTextColor={C.textMuted}
              value={form.busOperator}
              onChangeText={v => set('busOperator', v)}
              onFocus={closeDatePicker}
            />
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

  /* ── main render ────────────────────────────── */
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
        {/* ── Event Selection ── */}
        <SectionHeader icon="calendar" color={C.sectionEvent} title={preselectedEventId ? 'Linked to Event' : 'Link to Event'} />

        {selectedEvent ? (
          <TouchableOpacity
            style={[styles.selectedEventCard, { backgroundColor: preselectedEventId ? C.border : C.surface, borderColor: preselectedEventId ? C.border : C.primary + '30' }]}
            onPress={() => !preselectedEventId && setShowEventPicker(true)}
            activeOpacity={preselectedEventId ? 1 : 0.7}
            disabled={!!preselectedEventId}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectedEventName, { color: preselectedEventId ? C.textMuted : C.text }]}>{selectedEvent.clientName}</Text>
              <Text style={[styles.selectedEventInfo, { color: C.textSecondary }]}>
                {selectedEvent.eventType} • {formatDate(selectedEvent.eventDate)}
                {selectedEvent.city ? ` • ${selectedEvent.city}` : ''}
              </Text>
            </View>
            {!preselectedEventId && <Ionicons name="chevron-forward" size={18} color={C.textMuted} />}
            {preselectedEventId && <Ionicons name="lock-closed" size={16} color={C.textMuted} />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.selectEventBtn, { backgroundColor: C.primaryLight, borderColor: C.primary + '30' }]}
            onPress={() => setShowEventPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={C.primary} />
            <Text style={[styles.selectEventText, { color: C.primary }]}>Select an Event</Text>
          </TouchableOpacity>
        )}

        {/* Event Picker Modal */}
        <Modal visible={showEventPicker} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Select Event</Text>
              <TouchableOpacity onPress={() => setShowEventPicker(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearch, { backgroundColor: C.inputBg }]}>
              <Ionicons name="search" size={18} color={C.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: C.text }]}
                placeholder="Search by name, type, city…"
                placeholderTextColor={C.textMuted}
                value={eventSearch}
                onChangeText={setEventSearch}
              />
            </View>
            {loadingEvents ? (
              <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={filteredEvents}
                keyExtractor={item => item.id}
                renderItem={renderEventItem}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Ionicons name="calendar-outline" size={40} color={C.textMuted} />
                    <Text style={{ color: C.textSecondary, marginTop: 12 }}>No events found</Text>
                  </View>
                }
              />
            )}
          </View>
        </Modal>

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

        {/* ── Mode-specific fields (dates & ticket inside each mode) ── */}
        {renderModeFields()}

        {/* ── Cost (for non-own-car modes) ─── */}
        {form.travelMode !== 'own_car' && (
          <>
            <SectionHeader icon="wallet" color={C.sectionPricing} title="Cost" />
            <Text style={[styles.label, { color: C.textSecondary }]}>Total Cost (₹)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.borderLight, color: C.text }]}
              placeholder="0"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              value={form.totalCost}
              onChangeText={v => set('totalCost', v)}
              onFocus={closeDatePicker}
            />
          </>
        )}

        {/* ── Booked by Artist (not for own_car) ── */}
        {form.travelMode !== 'own_car' && (
          <TouchableOpacity
            style={[styles.checkboxRow, { backgroundColor: C.surface, borderColor: C.borderLight }]}
            onPress={() => set('bookedByArtist', !form.bookedByArtist)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, { borderColor: C.border }, form.bookedByArtist && styles.checkboxActive, form.bookedByArtist && { backgroundColor: C.primary, borderColor: C.primary }]}>
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

        {/* ── Save Button ──────────────────── */}
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
              <Text style={styles.saveBtnText}>Save Travel</Text>
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

  /* section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginLeft: 10 },

  /* event selection */
  selectedEventCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  selectedEventName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  selectedEventInfo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  selectEventBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryLight, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.primary + '30', gap: 8,
  },
  selectEventText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },

  /* event picker modal */
  modalContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'ios' ? 56 : 16 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 42,
  },
  modalSearchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: COLORS.text },

  eventPickerItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  eventPickerItemActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  eventPickerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventPickerInfo: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  /* mode grid */
  modeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  modeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  modeChipText: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  /* form */
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.borderLight,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  thirdField: { flex: 1 },

  /* date */
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  dateBtnText: { fontSize: 15, color: COLORS.text },



  /* ticket */
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

  /* checkbox */
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

  /* auto-total card */
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

  /* save */
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    marginTop: 28,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
