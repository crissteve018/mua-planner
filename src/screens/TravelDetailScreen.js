import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getTravelById, deleteTravel } from '../api/travel';
import {
  COLORS,
  TRAVEL_MODE_MAP,
} from '../constants';
import { useTheme } from '../context/SettingsContext';

/* ── helpers ─────────────────────────────────── */
const formatDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};

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

const InfoRow = ({ label, value, icon }) => {
  const C = useTheme();
  if (!value && value !== 0) return null;
  return (
    <View style={styles.infoRow}>
      {icon && <Ionicons name={icon} size={16} color={C.textSecondary} style={{ marginRight: 8 }} />}
      <Text style={[styles.infoLabel, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: C.text }]}>{value}</Text>
    </View>
  );
};

/* ─────────────────────────────────────────────── */
export default function TravelDetailScreen({ navigation, route }) {
  const C = useTheme();
  const { travelId } = route.params;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecord = useCallback(async () => {
    try {
      const res = await getTravelById(travelId);
      if (res.success) setRecord(res.data);
    } catch (err) {
      console.error('Error fetching travel:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [travelId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRecord();
    }, [fetchRecord])
  );

  const handleDelete = () => {
    Alert.alert('Delete Travel', 'Are you sure you want to delete this travel record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTravel(travelId);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={[styles.loader, { backgroundColor: C.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.danger} />
        <Text style={{ color: C.textSecondary, marginTop: 12 }}>Travel record not found</Text>
      </View>
    );
  }

  const mode = TRAVEL_MODE_MAP[record.travelMode] || TRAVEL_MODE_MAP.flight;

  /* ── route string ───────────────────────────── */
  const getRoute = () => {
    switch (record.travelMode) {
      case 'flight': return { from: record.departureCity, to: record.arrivalCity };
      case 'train':  return { from: record.departureStation, to: record.arrivalStation };
      case 'cab':    return { from: record.pickupLocation, to: record.dropLocation };
      case 'own_car':return { from: record.startingLocation, to: record.destination };
      case 'bus':    return { from: record.departureLocation, to: record.arrivalLocation };
      default:       return { from: record.departureLocation, to: record.arrivalLocation };
    }
  };
  const routeInfo = getRoute();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchRecord(); }}
          tintColor={C.primary}
        />
      }
    >
      {/* ── Hero Card ──────────────────────── */}
      <View style={[styles.heroCard, { borderLeftColor: mode.color, backgroundColor: C.surface }]}>
        <View style={styles.heroTop}>
          <View style={[styles.modeCircle, { backgroundColor: mode.color + '18' }]}>
            <Ionicons name={mode.icon} size={28} color={mode.color} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroMode, { color: C.text }]}>{mode.label}</Text>
          </View>
        </View>

        {/* Route */}
        {(routeInfo.from || routeInfo.to) && (
          <View style={styles.routeRow}>
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: C.info }]} />
              <Text style={[styles.routeText, { color: C.text }]}>{routeInfo.from || '—'}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={C.textMuted} style={{ marginHorizontal: 8 }} />
            <View style={styles.routePoint}>
              <View style={[styles.routeDot, { backgroundColor: C.success }]} />
              <Text style={[styles.routeText, { color: C.text }]}>{routeInfo.to || '—'}</Text>
            </View>
          </View>
        )}

        {/* Status pills */}
        <View style={styles.pillRow}>
          {record.bookedByArtist ? (
            <View style={[styles.statusPill, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="person" size={13} color="#D4883E" style={{ marginRight: 4 }} />
              <Text style={[styles.statusPillText, { color: '#D4883E' }]}>Booked by Artist</Text>
            </View>
          ) : null}
          {record.attachmentPath ? (
            <View style={[styles.statusPill, { backgroundColor: C.infoLight }]}>
              <Ionicons name="attach" size={13} color={C.info} style={{ marginRight: 4 }} />
              <Text style={[styles.statusPillText, { color: C.info }]}>Ticket Attached</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Linked Event ───────────────────── */}
      {record.clientName && (
        <>
          <SectionHeader icon="calendar" color={C.sectionEvent} title="Linked Event" />
          <View style={[styles.eventCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eventName, { color: C.text }]}>{record.clientName}</Text>
              <Text style={[styles.eventMeta, { color: C.textSecondary }]}>
                {record.eventType} • {formatDate(record.eventDate)}
                {record.city ? ` • ${record.city}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.eventLinkBtn}
              onPress={() => navigation.navigate('EventsTab', {
                screen: 'EventDetail',
                params: { eventId: record.eventId },
              })}
            >
              <Ionicons name="arrow-forward-circle" size={28} color={C.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Schedule ───────────────────────── */}
      <SectionHeader icon="time" color={C.info} title="Schedule" />
      <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
        <InfoRow label="Travel Date" value={formatDate(record.travelDate)} icon="calendar-outline" />
        {record.returnDate ? (
          <InfoRow label="Return Date" value={formatDate(record.returnDate)} icon="calendar-outline" />
        ) : null}
      </View>

      {/* ── Mode-Specific Details ──────────── */}
      {record.travelMode === 'flight' && (
        <>
          <SectionHeader icon="airplane" color={C.sectionFlight} title="Flight Details" />
          <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <InfoRow label="Airline" value={record.airlineName} icon="airplane-outline" />
            <InfoRow label="Travellers" value={record.numTravellers} icon="people-outline" />
          </View>
        </>
      )}

      {record.travelMode === 'train' && (
        <>
          <SectionHeader icon="train" color={C.sectionTrain} title="Train Details" />
          <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <InfoRow label="Train Number" value={record.trainNumber} icon="document-text-outline" />
            <InfoRow label="Train Name" value={record.trainName} icon="train-outline" />
            <InfoRow label="Travellers" value={record.numTravellers} icon="people-outline" />
          </View>
        </>
      )}

      {record.travelMode === 'cab' && (
        <>
          <SectionHeader icon="car-sport" color={C.sectionCab} title="Cab Details" />
          <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <InfoRow label="Provider" value={record.cabProvider} icon="car-sport-outline" />
            <InfoRow label="Estimated Fare" value={record.estimatedFare ? `₹${Number(record.estimatedFare).toLocaleString('en-IN')}` : null} icon="cash-outline" />
            <InfoRow label="Driver Contact" value={record.driverContact} icon="call-outline" />
          </View>
        </>
      )}

      {record.travelMode === 'own_car' && (
        <>
          <SectionHeader icon="car" color={C.sectionCar} title="Own Car Details" />
          <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <InfoRow label="Distance" value={record.distance ? `${record.distance} km` : null} icon="speedometer-outline" />
            <InfoRow label="Fuel Cost" value={record.fuelCost ? `₹${Number(record.fuelCost).toLocaleString('en-IN')}` : null} icon="flame-outline" />
            <InfoRow label="Toll Charges" value={record.tollCharges ? `₹${Number(record.tollCharges).toLocaleString('en-IN')}` : null} icon="card-outline" />
            <InfoRow label="Parking" value={record.parkingCharges ? `₹${Number(record.parkingCharges).toLocaleString('en-IN')}` : null} icon="car-outline" />
          </View>
        </>
      )}

      {record.travelMode === 'bus' && (
        <>
          <SectionHeader icon="bus" color={C.sectionBus} title="Bus Details" />
          <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <InfoRow label="Operator" value={record.busOperator} icon="bus-outline" />
            <InfoRow label="Travellers" value={record.numTravellers} icon="people-outline" />
          </View>
        </>
      )}

      {/* ── Cost Summary ───────────────────── */}
      {record.totalCost > 0 && (
        <>
          <SectionHeader icon="wallet" color={C.sectionPricing} title="Cost" />
          <View style={[styles.costCard, { backgroundColor: C.accentLight, borderColor: C.accent + '30' }]}>
            <Ionicons name="wallet" size={22} color={C.accent} />
            <Text style={[styles.costAmount, { color: C.accent }]}>
              ₹{Number(record.totalCost).toLocaleString('en-IN')}
            </Text>
          </View>
        </>
      )}

      {/* ── Notes ──────────────────────────── */}
      {record.notes ? (
        <>
          <SectionHeader icon="document-text" color={C.sectionNotes} title="Notes" />
          <View style={[styles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <Text style={[styles.notesText, { color: C.text }]}>{record.notes}</Text>
          </View>
        </>
      ) : null}

      {/* ── Action Bar ─────────────────────── */}
      <View style={[styles.actionBar, { backgroundColor: C.surface, borderTopColor: C.borderLight }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.primary }]}
          onPress={() => navigation.navigate('EditTravel', { travelId: record.id })}
        >
          <Ionicons name="create-outline" size={18} color="#FFF" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.danger }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={18} color="#FFF" />
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ── styles ───────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 18, paddingTop: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  /* section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginLeft: 10 },

  /* hero */
  heroCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 18,
    borderLeftWidth: 4, marginBottom: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modeCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  heroInfo: { marginLeft: 14, flex: 1 },
  heroMode: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  legBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: COLORS.accentLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2,
  },
  legBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },

  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  routePoint: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  routeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  routeText: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },

  pillRow: { flexDirection: 'row', gap: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12,
  },
  statusPillText: { fontSize: 12, fontWeight: '600' },

  /* event card */
  eventCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  eventName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  eventLinkBtn: {
    padding: 4,
  },

  /* detail card */
  detailCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.borderLight, gap: 10,
  },

  /* info row */
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'right', flex: 1 },

  /* cost */
  costCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.accentLight, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: COLORS.accent + '30',
  },
  costAmount: { fontSize: 24, fontWeight: '800', color: COLORS.accent },

  /* notes */
  notesText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  /* actions */
  actionBar: {
    flexDirection: 'row', gap: 12, marginTop: 28,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
