import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getEventById, deleteEvent, undoDeleteEvent } from '../api/events';
import { getTravelSummary, getTravelById, deleteTravel } from '../api/travel';
import { COLORS, EVENT_TYPE_EMOJI, STATUS_CONFIG, MONEY_OPTIONS, TRAVEL_MODE_MAP, TRAVEL_STATUS_MAP } from '../constants';
import { useTheme } from '../context/SettingsContext';
import UndoSnackbar from '../components/UndoSnackbar';

function SectionHeader({ icon, iconColor, title, titleColor }) {
  const C = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.iconCircle, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={16} color="#FFF" />
      </View>
      <Text style={[styles.sectionTitle, { color: C.text }, titleColor && { color: titleColor }]}>{title}</Text>
    </View>
  );
}

export default function EventDetailScreen({ route, navigation }) {
  const C = useTheme();
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', data: null });
  const deletedRef = useRef(null);
  const [travelData, setTravelData] = useState({ records: [], totalCost: 0, legCount: 0 });
  const [travelModal, setTravelModal] = useState({ visible: false, record: null, loading: false });

  const fetchEvent = async () => {
    try {
      const result = await getEventById(eventId);
      if (result.success) setEvent(result.data);
    } catch (err) {
      Alert.alert('Error', 'Could not load event details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchTravel = async () => {
    try {
      const res = await getTravelSummary(eventId);
      if (res.success) setTravelData(res.data);
    } catch (err) {
      console.error('Error fetching travel summary:', err);
    }
  };

  const openTravelDetail = async (travelId) => {
    setTravelModal({ visible: true, record: null, loading: true });
    try {
      const res = await getTravelById(travelId);
      if (res.success) setTravelModal({ visible: true, record: res.data, loading: false });
      else setTravelModal({ visible: false, record: null, loading: false });
    } catch (err) {
      setTravelModal({ visible: false, record: null, loading: false });
      Alert.alert('Error', 'Could not load travel details.');
    }
  };

  const handleDeleteTravel = (rec) => {
    Alert.alert('Delete Travel', 'Delete this travel record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteTravel(rec.id);
            setTravelModal({ visible: false, record: null, loading: false });
            fetchTravel();
          } catch (err) { Alert.alert('Error', 'Could not delete travel.'); }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => { fetchEvent(); fetchTravel(); }, [eventId])
  );

  // ─── Actions ────────────────────────────────
  const handleEdit = () => navigation.navigate('EditEvent', { eventId });

  const handleDelete = () => {
    Alert.alert('Delete Event', `Delete "${event.clientName}" event?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await deleteEvent(eventId);
            deletedRef.current = result.data || event;
            setSnackbar({ visible: true, message: `"${event.clientName}" deleted`, data: result.data || event });
            setTimeout(() => { if (deletedRef.current) navigation.goBack(); }, 5500);
          } catch (err) {
            Alert.alert('Error', 'Could not delete event.');
          }
        },
      },
    ]);
  };

  const handleUndoDelete = async () => {
    const data = deletedRef.current;
    if (!data) return;
    try {
      await undoDeleteEvent(data);
      deletedRef.current = null;
      setSnackbar({ visible: false, message: '', data: null });
      fetchEvent();
    } catch (err) {
      Alert.alert('Error', 'Could not undo delete.');
    }
  };

  const handleCancel = () => navigation.navigate('CancelEvent', { eventId, clientName: event.clientName });
  const handleClose = () => navigation.goBack();

  // ─── Quick actions ──────────────────────────
  const callPhone = (phone) => { if (phone) Linking.openURL(`tel:${phone}`); };
  const sendEmail = (email) => { if (email) Linking.openURL(`mailto:${email}`); };
  const openWhatsApp = (phone) => {
    if (phone) {
      const cleaned = phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${cleaned}`);
    }
  };

  // ─── Helpers ────────────────────────────────
  const getEmoji = (type) => EVENT_TYPE_EMOJI[type] || '📅';
  const getStatusConf = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const getMoneyLabel = (key) => {
    const found = MONEY_OPTIONS.find((o) => o.key === key);
    return found ? found.label : key;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <Text style={[styles.errorText, { color: C.textSecondary }]}>Event not found</Text>
      </View>
    );
  }

  const sc = getStatusConf(event.status);

  // Compute financial totals
  const extrasSum =
    (event.touchupAmount || 0) +
    (event.sareeDrapesAmount || 0) +
    (event.waitingAmount || 0) +
    (event.extraMakeupAmount || 0) +
    (event.extraHairdoAmount || 0);

  // Sum travel costs where artist booked (bookedByArtist === 1)
  const artistTravelCost = travelData.records
    .filter(r => r.bookedByArtist)
    .reduce((sum, r) => sum + (r.totalCost || 0), 0);

  const total = (event.packageAmount || 0) + extrasSum + artistTravelCost;
  const balance = total - (event.advancePaid || 0);
  const locationParts = [event.buildingName, event.address, event.city, event.state, event.country].filter(Boolean);
  const hasExtras = !!(event.touchupRequired || event.extraSareeDrapes || event.waitingRequired || event.extraMakeup || event.extraHairdo);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Close button */}
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: C.inputBg }]} onPress={handleClose}>
          <Ionicons name="close" size={24} color={C.text} />
        </TouchableOpacity>

        {/* ── Header Card ── */}
        <View style={[styles.headerCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <View style={[styles.headerEmojiCircle, { backgroundColor: C.primaryLight }]}>
            <Text style={styles.headerEmoji}>{getEmoji(event.eventType)}</Text>
          </View>
          <Text style={[styles.headerTitle, { color: C.text }]}>{event.clientName}</Text>
          <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>{event.eventType}</Text>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {/* ── Financial Summary ── */}
        <View style={styles.financeRow}>
          <View style={[styles.financeCard, { backgroundColor: C.successLight }]}>
            <Text style={[styles.financeLabel, { color: C.textSecondary }]}>Package</Text>
            <Text style={[styles.financeValue, { color: C.success }]}>
              ₹{Number(event.packageAmount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={[styles.financeCard, { backgroundColor: C.warningLight }]}>
            <Text style={[styles.financeLabel, { color: C.textSecondary }]}>Advance</Text>
            <Text style={[styles.financeValue, { color: C.warning }]}>
              ₹{Number(event.advancePaid || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          {artistTravelCost > 0 && (
            <View style={[styles.financeCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.financeLabel, { color: C.textSecondary }]}>Travel</Text>
              <Text style={[styles.financeValue, { color: '#D4883E' }]}>
                ₹{Number(artistTravelCost).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
          {extrasSum > 0 && (
            <View style={[styles.financeCard, { backgroundColor: '#F3E5F5' }]}>
              <Text style={[styles.financeLabel, { color: C.textSecondary }]}>Extras</Text>
              <Text style={[styles.financeValue, { color: '#7B1FA2' }]}>
                ₹{Number(extrasSum).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
          <View style={[styles.financeCard, { backgroundColor: balance > 0 ? C.dangerLight : C.successLight }]}>
            <Text style={[styles.financeLabel, { color: C.textSecondary }]}>Balance</Text>
            <Text style={[styles.financeValue, { color: balance > 0 ? C.danger : C.success }]}>
              ₹{Number(balance).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* ── Client Info ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="person" iconColor={C.sectionClient} title="Client Info" />
          <DetailRow icon="person" label="Client Name" value={event.clientName} />
          {event.clientPhone ? (
            <View style={styles.contactRow}>
              <View style={{ flex: 1 }}>
                <DetailRow icon="call" label="Phone" value={event.clientPhone} />
              </View>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: C.inputBg }]} onPress={() => callPhone(event.clientPhone)}>
                <Ionicons name="call" size={18} color={C.success} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: C.inputBg }]} onPress={() => openWhatsApp(event.clientPhone)}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
            </View>
          ) : null}
          {event.alternativePhone ? (
            <View style={styles.contactRow}>
              <View style={{ flex: 1 }}>
                <DetailRow icon="call" label="Alt. Number" value={event.alternativePhone} />
              </View>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: C.inputBg }]} onPress={() => callPhone(event.alternativePhone)}>
                <Ionicons name="call" size={18} color={C.success} />
              </TouchableOpacity>
            </View>
          ) : null}
          {event.emailAddress ? (
            <View style={styles.contactRow}>
              <View style={{ flex: 1 }}>
                <DetailRow icon="mail" label="Email" value={event.emailAddress} />
              </View>
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: C.inputBg }]} onPress={() => sendEmail(event.emailAddress)}>
                <Ionicons name="mail" size={18} color={C.info} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ── Event Details ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <SectionHeader icon="sparkles" iconColor={C.sectionEvent} title="Event Details" />
          <DetailRow icon="ribbon" label="Event Type" value={event.eventType} />
          {event.eventDate ? <DetailRow icon="calendar" label="Event Date" value={formatDate(event.eventDate)} /> : null}
          {event.eventTime ? <DetailRow icon="time" label="Start Time" value={event.eventTime} /> : null}
          {event.typeOfMakeup ? <DetailRow icon="color-palette" label="Makeup Type" value={event.typeOfMakeup} /> : null}
        </View>

        {/* ── Event Location ── */}
        {locationParts.length > 0 && (
          <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <SectionHeader icon="location" iconColor={C.sectionLocation} title="Event Location" />
            {event.buildingName ? <DetailRow icon="business" label="Venue" value={event.buildingName} /> : null}
            {event.address ? <DetailRow icon="navigate" label="Address" value={event.address} /> : null}
            {event.city ? <DetailRow icon="location" label="City" value={event.city} /> : null}
            {event.state ? <DetailRow icon="map" label="State" value={event.state} /> : null}
            {event.country ? <DetailRow icon="globe" label="Country" value={event.country} /> : null}
            {event.locationDirection ? (
              <TouchableOpacity
                style={styles.mapsLink}
                onPress={() => Linking.openURL(event.locationDirection)}
              >
                <Ionicons name="navigate" size={16} color={C.info} />
                <Text style={styles.mapsLinkText}>Get Directions</Text>
                <Ionicons name="open-outline" size={14} color={C.info} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── Work Location (if different) ── */}
        {event.workLocationDifferent ? (
          <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.info, borderWidth: 1.5 }]}>
            <SectionHeader icon="briefcase" iconColor={C.sectionLocation} title="Work Location" />
            {event.workBuildingName ? <DetailRow icon="business" label="Venue" value={event.workBuildingName} /> : null}
            {event.workAddress ? <DetailRow icon="navigate" label="Address" value={event.workAddress} /> : null}
            {event.workCity ? <DetailRow icon="location" label="City" value={event.workCity} /> : null}
            {event.workState ? <DetailRow icon="map" label="State" value={event.workState} /> : null}
            {event.workCountry ? <DetailRow icon="globe" label="Country" value={event.workCountry} /> : null}
            {event.workLocationDirection ? (
              <TouchableOpacity
                style={styles.mapsLink}
                onPress={() => Linking.openURL(event.workLocationDirection)}
              >
                <Ionicons name="navigate" size={16} color={C.info} />
                <Text style={styles.mapsLinkText}>Get Directions</Text>
                <Ionicons name="open-outline" size={14} color={C.info} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* ── Extra Services ── */}
        {hasExtras && (
          <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <SectionHeader icon="add-circle" iconColor={C.sectionExtras} title="Extra Services" />
            {event.touchupRequired ? (
              <ExtraServiceRow label="Touchup" count={event.touchupCount} unit="touchups" amount={event.touchupAmount} />
            ) : null}
            {event.extraSareeDrapes ? (
              <ExtraServiceRow label="Saree Drapes" count={event.sareeDrapesCount} unit="drapes" amount={event.sareeDrapesAmount} />
            ) : null}
            {event.waitingRequired ? (
              <ExtraServiceRow label="Waiting" count={event.waitingHours} unit="hours" amount={event.waitingAmount} />
            ) : null}
            {event.extraMakeup ? (
              <ExtraServiceRow label="Extra Makeup" count={event.extraMakeupCount} unit="makeups" amount={event.extraMakeupAmount} />
            ) : null}
            {event.extraHairdo ? (
              <ExtraServiceRow label="Extra Hairdo" count={event.extraHairdoCount} unit="hairdos" amount={event.extraHairdoAmount} />
            ) : null}
          </View>
        )}

        {/* ── Cancellation Info (if cancelled) ── */}
        {event.status === 'cancelled' && (
          <View style={[styles.section, { backgroundColor: C.surface, borderColor: '#FFCDD2', borderWidth: 1.5 }]}>
            <SectionHeader icon="alert-circle" iconColor={C.sectionCancel} title="Cancellation Details" titleColor={C.danger} />
            {event.cancelDate ? <DetailRow icon="calendar" label="Cancel Date" value={formatDate(event.cancelDate)} /> : null}
            {event.cancelReason ? <DetailRow icon="document-text" label="Reason" value={event.cancelReason} /> : null}
            {event.moneyOption ? <DetailRow icon="cash" label="Money Status" value={getMoneyLabel(event.moneyOption)} /> : null}
            {event.moneyAmount ? <DetailRow icon="wallet" label="Amount" value={`₹${Number(event.moneyAmount).toLocaleString('en-IN')}`} /> : null}
          </View>
        )}

        {/* ── Notes ── */}
        {event.notes ? (
          <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <SectionHeader icon="document-text" iconColor={C.sectionNotes} title="Notes" />
            <Text style={[styles.notesText, { color: C.text }]}>{event.notes}</Text>
          </View>
        ) : null}

        {/* ── Travel Summary ── */}
        <View style={[styles.section, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionHeader icon="airplane" iconColor={C.sectionTravel || '#00796B'} title="Travel" />
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 }}
              onPress={() => navigation.navigate('AddTravel', { eventId: event.id })}
            >
              <Ionicons name="add-circle" size={18} color={C.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.primary }}>Add</Text>
            </TouchableOpacity>
          </View>
          {travelData.legCount > 0 ? (
            <>
              {/* Cost summary */}
              {travelData.totalCost > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
                  <Ionicons name="wallet-outline" size={16} color={C.accent} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.accent }}>
                    Total Travel: ₹{Number(travelData.totalCost).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>
                    ({travelData.legCount} leg{travelData.legCount > 1 ? 's' : ''})
                  </Text>
                </View>
              )}
              {travelData.records.map((rec) => {
                const mode = TRAVEL_MODE_MAP[rec.travelMode] || { icon: 'help', color: '#999', label: rec.travelMode };
                const status = TRAVEL_STATUS_MAP[rec.travelStatus] || TRAVEL_STATUS_MAP.planned;
                const route = (() => {
                  switch (rec.travelMode) {
                    case 'flight': return [rec.departureCity, rec.arrivalCity].filter(Boolean).join(' → ');
                    case 'train':  return [rec.departureStation, rec.arrivalStation].filter(Boolean).join(' → ');
                    case 'cab':    return [rec.pickupLocation, rec.dropLocation].filter(Boolean).join(' → ');
                    case 'own_car':return [rec.startingLocation, rec.destination].filter(Boolean).join(' → ');
                    case 'bus':    return [rec.departureLocation, rec.arrivalLocation].filter(Boolean).join(' → ');
                    default:       return '';
                  }
                })();
                return (
                  <TouchableOpacity
                    key={rec.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
                      borderBottomWidth: 1, borderBottomColor: C.borderLight,
                    }}
                    onPress={() => openTravelDetail(rec.id)}
                  >
                    <View style={{
                      width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center',
                      backgroundColor: mode.color + '18',
                    }}>
                      <Ionicons name={mode.icon} size={16} color={mode.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>
                        {mode.label}
                      </Text>
                      {route ? <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>{route}</Text> : null}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: status.bg, paddingHorizontal: 8, paddingVertical: 3 }]}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: status.color }}>{status.label}</Text>
                    </View>
                    {rec.totalCost > 0 && (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: C.accent, marginLeft: 8 }}>
                        ₹{Number(rec.totalCost).toLocaleString('en-IN')}
                      </Text>
                    )}
                    {rec.bookedByArtist ? (
                      <View style={{ marginLeft: 4, backgroundColor: '#FFF3E0', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                        <Ionicons name="person" size={10} color="#D4883E" />
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={16} color={C.textMuted} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Ionicons name="airplane-outline" size={28} color={C.textMuted} />
              <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>No travel added yet</Text>
            </View>
          )}
        </View>

        {/* spacer for action bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Action Bar ── */}
      <View style={[styles.actionBar, { backgroundColor: C.surface, borderTopColor: C.borderLight }]}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.infoLight }]} onPress={handleEdit}>
          <Ionicons name="create-outline" size={20} color={C.info} />
          <Text style={[styles.actionBtnText, { color: C.info }]}>Edit</Text>
        </TouchableOpacity>

        {event.status !== 'cancelled' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.warningLight }]} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={20} color={C.warning} />
            <Text style={[styles.actionBtnText, { color: C.warning }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.dangerLight }]} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={C.danger} />
          <Text style={[styles.actionBtnText, { color: C.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Undo Snackbar */}
      <UndoSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        onUndo={handleUndoDelete}
        onDismiss={() => {
          deletedRef.current = null;
          setSnackbar({ visible: false, message: '', data: null });
        }}
      />

      {/* ── Travel Detail Modal (3/4 screen) ── */}
      <Modal
        visible={travelModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setTravelModal({ visible: false, record: null, loading: false })}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: C.background }]}>  
            {/* Close button */}
            <TouchableOpacity
              style={[modalStyles.closeBtn, { backgroundColor: C.inputBg }]}
              onPress={() => setTravelModal({ visible: false, record: null, loading: false })}
            >
              <Ionicons name="close" size={22} color={C.text} />
            </TouchableOpacity>

            {travelModal.loading ? (
              <View style={modalStyles.loaderWrap}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            ) : travelModal.record ? (
              <TravelDetailContent
                record={travelModal.record}
                C={C}
                onEdit={() => {
                  setTravelModal({ visible: false, record: null, loading: false });
                  navigation.navigate('EditTravel', { travelId: travelModal.record.id });
                }}
                onDelete={() => handleDeleteTravel(travelModal.record)}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  const C = useTheme();
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={C.primary} style={{ marginRight: 12, marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: C.text }]}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function ExtraServiceRow({ label, count, unit, amount }) {
  const C = useTheme();
  return (
    <View style={styles.extraRow}>
      <Ionicons name="checkmark-circle" size={18} color={C.primary} style={{ marginRight: 12, marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.extraLabel, { color: C.text }]}>{label}</Text>
        <Text style={[styles.extraDetail, { color: C.textSecondary }]}>
          {count} {unit}  •  ₹{Number(amount || 0).toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

/* ── Travel Detail Modal Content ────────────── */
const travelFormatDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};

function TravelDetailContent({ record, C, onEdit, onDelete }) {
  const mode = TRAVEL_MODE_MAP[record.travelMode] || { icon: 'help', color: '#999', label: record.travelMode };
  const getRoute = () => {
    switch (record.travelMode) {
      case 'flight': return { from: record.departureCity, to: record.arrivalCity };
      case 'train':  return { from: record.departureStation, to: record.arrivalStation };
      case 'cab':    return { from: record.pickupLocation, to: record.dropLocation };
      case 'own_car':return { from: record.startingLocation, to: record.destination };
      case 'bus':    return { from: record.departureLocation, to: record.arrivalLocation };
      default:       return { from: '', to: '' };
    }
  };
  const routeInfo = getRoute();

  const TravelInfoRow = ({ label, value, icon }) => {
    if (!value && value !== 0) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {icon && <Ionicons name={icon} size={15} color={C.textSecondary} style={{ marginRight: 8 }} />}
        <Text style={{ fontSize: 13, color: C.textSecondary, flex: 1 }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, textAlign: 'right', flex: 1 }}>{value}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={[modalStyles.heroCard, { borderLeftColor: mode.color, backgroundColor: C.surface }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: mode.color + '18' }}>
            <Ionicons name={mode.icon} size={24} color={mode.color} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginLeft: 12 }}>{mode.label}</Text>
        </View>
        {(routeInfo.from || routeInfo.to) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.info, marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, flex: 1 }}>{routeInfo.from || '—'}</Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={C.textMuted} style={{ marginHorizontal: 6 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.success, marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, flex: 1 }}>{routeInfo.to || '—'}</Text>
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {record.bookedByArtist ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Ionicons name="person" size={12} color="#D4883E" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#D4883E' }}>Booked by Artist</Text>
            </View>
          ) : null}
          {record.attachmentPath ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.infoLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Ionicons name="attach" size={12} color={C.info} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.info }}>Ticket Attached</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Schedule */}
      <View style={[modalStyles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ width: 26, height: 26, borderRadius: 7, justifyContent: 'center', alignItems: 'center', backgroundColor: C.info }}>
            <Ionicons name="time" size={14} color="#FFF" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, marginLeft: 8 }}>Schedule</Text>
        </View>
        <TravelInfoRow label="Travel Date" value={travelFormatDate(record.travelDate)} icon="calendar-outline" />
        {record.returnDate ? <TravelInfoRow label="Return Date" value={travelFormatDate(record.returnDate)} icon="calendar-outline" /> : null}
        <TravelInfoRow label="Travellers" value={record.numTravellers} icon="people-outline" />
      </View>

      {/* Mode-Specific Details */}
      {record.travelMode === 'flight' && record.airlineName ? (
        <View style={[modalStyles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <TravelInfoRow label="Airline" value={record.airlineName} icon="airplane-outline" />
        </View>
      ) : null}
      {record.travelMode === 'train' && (record.trainNumber || record.trainName) ? (
        <View style={[modalStyles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <TravelInfoRow label="Train Number" value={record.trainNumber} icon="document-text-outline" />
          <TravelInfoRow label="Train Name" value={record.trainName} icon="train-outline" />
        </View>
      ) : null}
      {record.travelMode === 'cab' && (record.cabProvider || record.driverContact) ? (
        <View style={[modalStyles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <TravelInfoRow label="Provider" value={record.cabProvider} icon="car-sport-outline" />
          <TravelInfoRow label="Est. Fare" value={record.estimatedFare ? `₹${Number(record.estimatedFare).toLocaleString('en-IN')}` : null} icon="cash-outline" />
          <TravelInfoRow label="Driver Contact" value={record.driverContact} icon="call-outline" />
        </View>
      ) : null}
      {record.travelMode === 'own_car' ? (
        <View style={[modalStyles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <TravelInfoRow label="Distance" value={record.distance ? `${record.distance} km` : null} icon="speedometer-outline" />
          <TravelInfoRow label="Fuel Cost" value={record.fuelCost ? `₹${Number(record.fuelCost).toLocaleString('en-IN')}` : null} icon="flame-outline" />
          <TravelInfoRow label="Toll" value={record.tollCharges ? `₹${Number(record.tollCharges).toLocaleString('en-IN')}` : null} icon="card-outline" />
          <TravelInfoRow label="Parking" value={record.parkingCharges ? `₹${Number(record.parkingCharges).toLocaleString('en-IN')}` : null} icon="car-outline" />
        </View>
      ) : null}
      {record.travelMode === 'bus' && record.busOperator ? (
        <View style={[modalStyles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <TravelInfoRow label="Operator" value={record.busOperator} icon="bus-outline" />
        </View>
      ) : null}

      {/* Cost */}
      {record.totalCost > 0 && (
        <View style={[modalStyles.costCard, { backgroundColor: C.accentLight, borderColor: C.accent + '30' }]}>
          <Ionicons name="wallet" size={20} color={C.accent} />
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.accent, marginLeft: 8 }}>
            ₹{Number(record.totalCost).toLocaleString('en-IN')}
          </Text>
        </View>
      )}

      {/* Notes */}
      {record.notes ? (
        <View style={[modalStyles.detailCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Text style={{ fontSize: 14, color: C.text, lineHeight: 20 }}>{record.notes}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 30 }}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: C.primary }}
          onPress={onEdit}
        >
          <Ionicons name="create-outline" size={18} color="#FFF" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: C.danger }}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={18} color="#FFF" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SCREEN_HEIGHT * 0.75,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    margin: 14,
    marginBottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  detailCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
  },
  costCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { fontSize: 16, color: COLORS.textSecondary },

  closeBtn: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.inputBg,
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },

  // ── Header ──
  headerCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  headerEmojiCircle: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  headerEmoji: { fontSize: 32 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 12 },
  statusPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontWeight: '600', fontSize: 14 },

  // ── Finance ──
  financeRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  financeCard: { flex: 1, minWidth: 60, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
  financeLabel: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  financeValue: { fontSize: 13, fontWeight: '800' },

  // ── Sections ──
  section: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.borderLight,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  iconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, letterSpacing: 0.2 },

  // ── Detail rows ──
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  detailLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.3 },
  detailValue: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  notesText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

  // ── Extra service rows ──
  extraRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  extraLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  extraDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  // ── Maps Link ──
  mapsLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 8,
    paddingVertical: 8, paddingHorizontal: 12, backgroundColor: COLORS.infoLight,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  mapsLinkText: { fontSize: 13, color: COLORS.info, fontWeight: '600' },

  // ── Contact ──
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  quickAction: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.inputBg, justifyContent: 'center', alignItems: 'center',
    marginLeft: 6,
  },

  // ── Action Bar ──
  actionBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
});
