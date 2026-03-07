import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAllTravel, deleteTravel } from '../api/travel';
import {
  COLORS,
  TRAVEL_MODE_MAP,
  STATUS_CONFIG,
} from '../constants';
import UndoSnackbar from '../components/UndoSnackbar';
import { useTheme } from '../context/SettingsContext';

const EVENT_STATUS_FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'upcoming',  label: 'Upcoming',  color: STATUS_CONFIG.upcoming.color,  bg: STATUS_CONFIG.upcoming.bg },
  { key: 'completed', label: 'Completed', color: STATUS_CONFIG.completed.color, bg: STATUS_CONFIG.completed.bg },
  { key: 'cancelled', label: 'Cancelled', color: STATUS_CONFIG.cancelled.color, bg: STATUS_CONFIG.cancelled.bg },
];

/* ── helpers ─────────────────────────────────── */
const formatDate = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};

const getRoute = (rec) => {
  switch (rec.travelMode) {
    case 'flight': return [rec.departureCity, rec.arrivalCity].filter(Boolean).join(' → ');
    case 'train':  return [rec.departureStation, rec.arrivalStation].filter(Boolean).join(' → ');
    case 'cab':    return [rec.pickupLocation, rec.dropLocation].filter(Boolean).join(' → ');
    case 'own_car':return [rec.startingLocation, rec.destination].filter(Boolean).join(' → ');
    case 'bus':    return [rec.departureLocation, rec.arrivalLocation].filter(Boolean).join(' → ');
    default:       return [rec.departureLocation, rec.arrivalLocation].filter(Boolean).join(' → ') || '—';
  }
};

/* ─────────────────────────────────────────────── */
export default function TravelListScreen({ navigation }) {
  const C = useTheme();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortByDate, setSortByDate] = useState(true);

  // Tooltip
  const [tooltip, setTooltip] = useState(null);
  const tooltipTimer = useRef(null);
  const showTooltip = (label) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(label);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 1400);
  };

  // Undo snackbar
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', data: null });

  /* ── header buttons ─────────────────────────── */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowSearch(v => !v)}
            onLongPress={() => showTooltip('Search')}
          >
            <Ionicons
              name={showSearch ? 'close-circle' : 'search'}
              size={21}
              color={showSearch ? C.primary : C.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setSortByDate(v => !v)}
            onLongPress={() => showTooltip('Sort by date')}
          >
            <Ionicons
              name="swap-vertical"
              size={21}
              color={sortByDate ? C.info : C.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('AddTravel')}
            onLongPress={() => showTooltip('Add travel')}
          >
            <Ionicons name="add-circle" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, showSearch, sortByDate, C]);

  /* ── fetch ──────────────────────────────────── */
  const fetchTravel = useCallback(async () => {
    try {
      const params = {};
      if (activeFilter !== 'all') params.eventStatus = activeFilter;
      const res = await getAllTravel(params);
      if (res.success) setRecords(res.data);
    } catch (err) {
      console.error('Error fetching travel:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTravel();
    }, [fetchTravel])
  );

  /* ── derived list ───────────────────────────── */
  const filteredRecords = (() => {
    let list = [...records];

    // text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(r =>
        (r.clientName || '').toLowerCase().includes(q) ||
        getRoute(r).toLowerCase().includes(q) ||
        (r.airlineName || '').toLowerCase().includes(q) ||
        (r.trainName || '').toLowerCase().includes(q) ||
        (r.cabProvider || '').toLowerCase().includes(q) ||
        (r.busOperator || '').toLowerCase().includes(q)
      );
    }

    // sort
    list.sort((a, b) => {
      if (sortByDate) {
        return (a.travelDate || '').localeCompare(b.travelDate || '');
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return list;
  })();

  /* ── delete ─────────────────────────────────── */
  const handleDelete = (item) => {
    Alert.alert('Delete Travel', 'Remove this travel record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTravel(item.id);
            setSnackbar({ visible: true, message: 'Travel deleted', data: item });
            fetchTravel();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  /* ── render card ────────────────────────────── */
  const renderRecord = ({ item }) => {
    const mode = TRAVEL_MODE_MAP[item.travelMode] || TRAVEL_MODE_MAP.flight;
    const evStatus = STATUS_CONFIG[item.eventStatus] || STATUS_CONFIG.upcoming;
    const route = getRoute(item);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TravelDetail', { travelId: item.id })}
      >
        {/* Mode color strip */}
        <View style={[styles.statusStrip, { backgroundColor: mode.color }]} />

        <View style={styles.cardContent}>
          {/* Row 1: mode icon + event info */}
          <View style={styles.cardHeader}>
            <View style={[styles.modeCircle, { backgroundColor: mode.color + '18' }]}>
              <Ionicons name={mode.icon} size={20} color={mode.color} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.modeName, { color: C.text }]}>{mode.label}</Text>
              {item.clientName ? (
                <Text style={[styles.eventLabel, { color: C.textSecondary }]} numberOfLines={1}>
                  {item.clientName} — {item.eventType}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Row 2: route + date */}
          <View style={styles.cardBody}>
            {route ? (
              <View style={styles.infoRow}>
                <Ionicons name="navigate-outline" size={14} color={C.textSecondary} />
                <Text style={[styles.infoText, { color: C.textSecondary }]} numberOfLines={1}>{route}</Text>
              </View>
            ) : null}
            {item.travelDate ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
                <Text style={[styles.infoText, { color: C.textSecondary }]}>{formatDate(item.travelDate)}</Text>
              </View>
            ) : null}
          </View>

          {/* Row 3: event status pill + cost */}
          <View style={styles.cardFooter}>
            <View style={[styles.statusPill, { backgroundColor: evStatus.bg }]}>
              <Text style={[styles.statusPillText, { color: evStatus.color }]}>{evStatus.label}</Text>
            </View>
            {item.totalCost > 0 && (
              <View style={styles.costWrap}>
                <Ionicons name="wallet-outline" size={14} color={C.accent} />
                <Text style={[styles.costText, { color: C.accent }]}>
                  ₹{Number(item.totalCost).toLocaleString('en-IN')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ── empty state ────────────────────────────── */
  const renderEmpty = () => {
    if (loading) return null;
    const isFiltered = activeFilter !== 'all' || searchText.trim();
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={isFiltered ? 'funnel-outline' : 'airplane-outline'}
          size={56}
          color={C.primaryMuted}
        />
        <Text style={[styles.emptyTitle, { color: C.text }]}>
          {isFiltered ? 'No matches' : 'No travel records yet'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
          {isFiltered
            ? 'Try changing filters or search'
            : 'Tap + to add your first travel plan'}
        </Text>
      </View>
    );
  };

  /* ── status chips (based on event status) ───── */
  const renderChips = () => (
    <View style={styles.chipRow}>
      {EVENT_STATUS_FILTERS.map(f => {
        const isActive = activeFilter === f.key;
        return (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.chip,
              { backgroundColor: C.surface, borderColor: C.border },
              isActive && { backgroundColor: f.color || C.primary, borderColor: f.color || C.primary },
            ]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.chipText, { color: C.textSecondary }, isActive && { color: '#FFF' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /* ── main render ────────────────────────────── */
  if (loading && records.length === 0) {
    return (
      <View style={[styles.loader, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Tooltip */}
      {tooltip && (
        <View style={styles.tooltipWrap}>
          <View style={[styles.tooltipBubble, { backgroundColor: C.text }]}>
            <Text style={[styles.tooltipText, { color: C.background }]}>{tooltip}</Text>
          </View>
        </View>
      )}

      {/* Search bar */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search" size={18} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search route, airline, client…"
            placeholderTextColor={C.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {renderChips()}

      <FlatList
        data={filteredRecords}
        keyExtractor={item => item.id}
        renderItem={renderRecord}
        contentContainerStyle={filteredRecords.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchTravel(); }}
            tintColor={C.primary}
          />
        }
      />

      <UndoSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar({ visible: false, message: '', data: null })}
        onUndo={() => {
          setSnackbar({ visible: false, message: '', data: null });
          // For future: re-insert travel
        }}
      />
    </View>
  );
}

/* ── styles ───────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },

  /* header */
  headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: 8, gap: 2 },
  headerBtn: { padding: 7 },

  /* tooltip */
  tooltipWrap: {
    position: 'absolute', top: 2, right: 16, zIndex: 999,
    alignItems: 'flex-end',
  },
  tooltipBubble: {
    backgroundColor: '#1A1A2E', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  tooltipText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

  /* search */
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 10, marginBottom: 2,
    backgroundColor: COLORS.inputBg, borderRadius: 12,
    paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: COLORS.text },

  /* chips */
  chipRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },

  /* card */
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusStrip: { width: 4 },
  cardContent: { flex: 1, padding: 14 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  modeCircle: {
    width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
  },
  cardHeaderText: { flex: 1, marginLeft: 10 },
  modeName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  cardBody: { marginBottom: 8, gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  costWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  costText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },

  /* empty */
  emptyContainer: { alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 },
});
