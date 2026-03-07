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
  Platform,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {
  getAllEvents,
  deleteEvent,
  undoDeleteEvent,
  completeEvent,
} from '../api/events';
import { COLORS, EVENT_TYPE_EMOJI, STATUS_CONFIG, TRAVEL_MODE_MAP } from '../constants';
import { useTheme } from '../context/SettingsContext';
import UndoSnackbar from '../components/UndoSnackbar';

const FILTERS = ['all', 'upcoming', 'completed', 'cancelled'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANE_WIDTH = SCREEN_WIDTH * 0.72;

export default function EventListScreen({ navigation }) {
  const C = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Sort & filters
  const [sortByDate, setSortByDate] = useState(false);
  const [filterMonth, setFilterMonth] = useState(null);
  const [showUnsettled, setShowUnsettled] = useState(false);

  // Filter pane
  const [filterPaneVisible, setFilterPaneVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

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
  const deletedRef = useRef(null);
  const swipeableRefs = useRef({});

  // ─── Header Right Actions ──────────────────
  const hasActiveFilters = filterMonth !== null || showUnsettled;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowSearch((v) => !v)}
            onLongPress={() => showTooltip('Search')}
            accessibilityLabel="Search"
          >
            <Ionicons
              name={showSearch ? 'close-circle' : 'search'}
              size={21}
              color={showSearch ? C.primary : C.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setSortByDate((v) => !v)}
            onLongPress={() => showTooltip('Sort by date')}
            accessibilityLabel="Sort by date"
          >
            <Ionicons
              name="swap-vertical"
              size={21}
              color={sortByDate ? C.info : C.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={openFilterPane}
            onLongPress={() => showTooltip('Filter options')}
            accessibilityLabel="Filter"
          >
            <Ionicons
              name="options-outline"
              size={21}
              color={hasActiveFilters ? C.warning : C.textSecondary}
            />
            {hasActiveFilters && <View style={styles.filterBadge} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('AddEvent')}
            onLongPress={() => showTooltip('Add new event')}
            accessibilityLabel="Add event"
          >
            <Ionicons name="add-circle" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, sortByDate, showSearch, filterMonth, showUnsettled, C]);

  // ─── Filter Pane Open / Close ──────────────
  const openFilterPane = () => {
    setFilterPaneVisible(true);
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH - PANE_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const closeFilterPane = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start(() => setFilterPaneVisible(false));
  };

  const clearAllFilters = () => {
    setFilterMonth(null);
    setShowUnsettled(false);
  };

  // ─── Fetch Events ──────────────────────────
  const fetchEvents = async () => {
    try {
      const params = {};
      if (activeFilter !== 'all') params.status = activeFilter;
      if (searchText.trim()) params.search = searchText.trim();
      const result = await getAllEvents(params);
      if (result.success) {
        setEvents(result.data);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load events. Make sure the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchEvents();
    }, [activeFilter, searchText])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // ─── Helpers ────────────────────────────────
  const getEmoji = (type) => EVENT_TYPE_EMOJI[type] || '📅';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusConf = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;

  const calcBalance = (item) => {
    const extrasSum =
      (item.touchupAmount || 0) +
      (item.sareeDrapesAmount || 0) +
      (item.waitingAmount || 0) +
      (item.extraMakeupAmount || 0) +
      (item.extraHairdoAmount || 0);
    const total = (item.packageAmount || 0) + extrasSum;
    return total - (item.advancePaid || 0);
  };

  // ─── Swipe Actions ─────────────────────────
  const closeAllSwipeables = () => {
    Object.values(swipeableRefs.current).forEach((ref) => ref?.close());
  };

  const handleMarkComplete = (item) => {
    closeAllSwipeables();
    Alert.alert(
      'Mark Completed',
      `Mark "${item.clientName}" event as completed?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Complete',
          onPress: async () => {
            try {
              await completeEvent(item.id);
              fetchEvents();
            } catch (err) {
              Alert.alert('Error', 'Could not complete event.');
            }
          },
        },
      ]
    );
  };

  const handleMarkCancelled = (item) => {
    closeAllSwipeables();
    navigation.navigate('CancelEvent', { eventId: item.id, clientName: item.clientName });
  };

  const handleUndoDelete = async () => {
    const data = deletedRef.current;
    if (!data) return;
    try {
      await undoDeleteEvent(data);
      deletedRef.current = null;
      setSnackbar({ visible: false, message: '', data: null });
      fetchEvents();
    } catch (err) {
      Alert.alert('Error', 'Could not undo delete.');
    }
  };

  // ─── Client-side Sort & Filter ─────────────
  const getProcessedEvents = () => {
    let filtered = [...events];

    // Month filter
    if (filterMonth !== null) {
      filtered = filtered.filter((e) => {
        if (!e.eventDate) return false;
        const d = new Date(e.eventDate + 'T00:00:00');
        return d.getMonth() === filterMonth;
      });
    }

    // Unsettled filter (balance > 0)
    if (showUnsettled) {
      filtered = filtered.filter((e) => calcBalance(e) > 0);
    }

    // Sort by event date ascending
    if (sortByDate) {
      filtered.sort((a, b) => {
        const da = a.eventDate || '9999-12-31';
        const db2 = b.eventDate || '9999-12-31';
        return da.localeCompare(db2);
      });
    }

    return filtered;
  };

  // ─── Render: Filter Chips (Status) ─────────
  const renderFilterChips = () => (
    <View style={styles.chipRow}>
      {FILTERS.map((f) => {
        const isActive = activeFilter === f;
        return (
          <TouchableOpacity
            key={f}
            style={[styles.chip, isActive ? { backgroundColor: C.primary, borderColor: C.primary } : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isActive ? styles.chipTextActive : { color: C.textSecondary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ─── Render: Swipe Right Actions ───────────
  const renderRightActions = (item) => {
    if (item.status !== 'upcoming') return null;
    return (
      <View style={styles.swipeActionsRow}>
        <TouchableOpacity
          style={[styles.swipeAction, { backgroundColor: C.success }]}
          onPress={() => handleMarkComplete(item)}
        >
          <Ionicons name="checkmark-circle" size={22} color={C.white} />
          <Text style={styles.swipeActionText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.swipeAction,
            { backgroundColor: C.danger, borderTopRightRadius: 16, borderBottomRightRadius: 16 },
          ]}
          onPress={() => handleMarkCancelled(item)}
        >
          <Ionicons name="close-circle" size={22} color={C.white} />
          <Text style={styles.swipeActionText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ─── Render: Event Card ────────────────────
  const renderEvent = ({ item }) => {
    const sc = getStatusConf(item.status);
    const balance = calcBalance(item);

    const cardContent = (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        activeOpacity={0.7}
      >
        {/* Status strip */}
        <View style={[styles.statusStrip, { backgroundColor: sc.color }]} />

        <View style={styles.cardContent}>
          {/* Row 1: icon + name + travel modes */}
          <View style={styles.cardHeader}>
            <View style={[styles.eventIconCircle, { backgroundColor: C.primaryLight }]}>
              <Text style={styles.eventEmoji}>{getEmoji(item.eventType)}</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.clientName, { color: C.text }]} numberOfLines={1}>
                {item.clientName}
              </Text>
              <Text style={[styles.eventType, { color: C.textSecondary }]}>{item.eventType}</Text>
            </View>
            {item.travelModes ? (
              <View style={styles.travelIcons}>
                {item.travelModes.split(',').map((mode) => {
                  const m = TRAVEL_MODE_MAP[mode.trim()];
                  if (!m) return null;
                  return (
                    <View key={mode} style={[styles.travelIconBadge, { backgroundColor: m.color + '18' }]}>
                      <Ionicons name={m.icon} size={13} color={m.color} />
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Row 2: date + location */}
          <View style={styles.cardBody}>
            {item.eventDate ? (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
                <Text style={[styles.infoText, { color: C.textSecondary }]}>{formatDate(item.eventDate)}</Text>
              </View>
            ) : null}
            {item.city ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color={C.textSecondary} />
                <Text style={[styles.infoText, { color: C.textSecondary }]} numberOfLines={1}>
                  {[item.city, item.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Row 3: status pill + balance */}
          <View style={[styles.cardFooter, { borderTopColor: C.borderLight }]}>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusPillText, { color: sc.color }]}>{sc.label}</Text>
            </View>
            <View style={styles.balanceWrap}>
              {balance > 0 ? (
                <>
                  <Ionicons name="wallet-outline" size={14} color={C.warning} />
                  <Text style={[styles.balanceDue, { color: C.warning }]}>
                    ₹{Number(balance).toLocaleString('en-IN')} due
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={14} color={C.success} />
                  <Text style={[styles.balanceSettled, { color: C.success }]}>Settled</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );

    // Wrap upcoming events in Swipeable for quick actions
    if (item.status === 'upcoming') {
      return (
        <Swipeable
          ref={(ref) => {
            swipeableRefs.current[item.id] = ref;
          }}
          renderRightActions={() => renderRightActions(item)}
          overshootRight={false}
          friction={2}
        >
          {cardContent}
        </Swipeable>
      );
    }

    return cardContent;
  };

  // ─── Render: Empty State (context-aware) ───
  const renderEmptyState = () => {
    let icon, title, subtitle;

    switch (activeFilter) {
      case 'completed':
        icon = 'sparkles';
        title = 'No Completed Events Yet';
        subtitle =
          "Your first masterpiece awaits! Every great artist starts with one — keep going, you're doing amazing!";
        break;
      case 'cancelled':
        icon = 'heart-half-outline';
        title = 'No Cancelled Events';
        subtitle =
          'Great news — no cancellations here! Your bookings are going strong.';
        break;
      case 'upcoming':
        icon = 'calendar-outline';
        title = 'No Upcoming Events';
        subtitle = 'Tap the + button to add your next event booking.';
        break;
      default:
        icon = 'calendar-outline';
        title = 'No Events Yet';
        subtitle = 'Tap the + button to add your first event booking.';
    }

    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconCircle, { backgroundColor: C.primaryLight }]}>
          <Ionicons name={icon} size={40} color={C.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      </View>
    );
  };

  // ─── Render: Filter Pane (slides from right) ─
  const renderFilterPane = () => (
    <Modal
      visible={filterPaneVisible}
      transparent
      animationType="none"
      onRequestClose={closeFilterPane}
    >
      <View style={styles.paneOverlayWrap}>
        {/* Tap overlay to close */}
        <Pressable style={styles.paneOverlay} onPress={closeFilterPane} />

        {/* Sliding panel */}
        <Animated.View
          style={[styles.filterPane, { transform: [{ translateX: slideAnim }], backgroundColor: C.surface }]}
        >
          {/* Pane header */}
          <View style={[styles.paneHeader, { borderBottomColor: C.borderLight }]}>
            <Text style={[styles.paneTitle, { color: C.text }]}>Filters</Text>
            <View style={styles.paneHeaderRight}>
              {hasActiveFilters && (
                <TouchableOpacity onPress={clearAllFilters} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Clear all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={closeFilterPane} hitSlop={8}>
                <Ionicons name="close" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.paneBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* ── Section: Month ── */}
            <View style={styles.paneSection}>
              <View style={styles.paneSectionHeader}>
                <Ionicons name="calendar-outline" size={16} color={C.accent} />
                <Text style={[styles.paneSectionTitle, { color: C.text }]}>Month</Text>
              </View>

              <View style={styles.monthGrid}>
                <TouchableOpacity
                  style={[styles.monthCell, filterMonth === null ? { backgroundColor: C.accent } : { backgroundColor: C.background }]}
                  onPress={() => setFilterMonth(null)}
                >
                  <Text
                    style={[
                      styles.monthCellText,
                      filterMonth === null && styles.monthCellTextActive,
                      filterMonth !== null && { color: C.textSecondary },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {MONTHS.map((m, idx) => {
                  const isActive = filterMonth === idx;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthCell, isActive ? { backgroundColor: C.accent } : { backgroundColor: C.background }]}
                      onPress={() => setFilterMonth(isActive ? null : idx)}
                    >
                      <Text
                        style={[styles.monthCellText, isActive && styles.monthCellTextActive, !isActive && { color: C.textSecondary }]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Section: Payment ── */}
            <View style={styles.paneSection}>
              <View style={styles.paneSectionHeader}>
                <Ionicons name="wallet-outline" size={16} color={C.accent} />
                <Text style={[styles.paneSectionTitle, { color: C.text }]}>Payment</Text>
              </View>

              <TouchableOpacity
                style={[styles.paneOption, showUnsettled ? { backgroundColor: C.warningLight } : { backgroundColor: C.background }]}
                onPress={() => setShowUnsettled((v) => !v)}
              >
                <Ionicons
                  name={showUnsettled ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={showUnsettled ? C.warning : C.textMuted}
                />
                <Text
                  style={[
                    styles.paneOptionText,
                    { color: C.textSecondary },
                    showUnsettled && { color: C.warning, fontWeight: '700' },
                  ]}
                >
                  Yet to Settle (Balance Due)
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Apply button */}
          <TouchableOpacity style={[styles.paneApplyBtn, { backgroundColor: C.primary }]} onPress={closeFilterPane}>
            <Text style={styles.paneApplyBtnText}>Apply</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );

  // ─── Processed (filtered + sorted) data ────
  const processedEvents = getProcessedEvents();

  // ─── Loading state ─────────────────────────
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading events...</Text>
      </View>
    );
  }

  // ─── Main Layout ───────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Search bar */}
      {showSearch && (
        <View style={[styles.searchRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search" size={18} color={C.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search by client name..."
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

      {/* Active filter tags bar (shows what filters are on) */}
      {hasActiveFilters && (
        <View style={styles.activeTagsRow}>
          {filterMonth !== null && (
            <View style={[styles.activeTag, { backgroundColor: C.accentLight }]}>
              <Text style={[styles.activeTagText, { color: C.accent }]}>{MONTHS[filterMonth]}</Text>
              <TouchableOpacity onPress={() => setFilterMonth(null)} hitSlop={6}>
                <Ionicons name="close-circle" size={14} color={C.accent} />
              </TouchableOpacity>
            </View>
          )}
          {showUnsettled && (
            <View style={[styles.activeTag, { backgroundColor: C.warningLight }]}>
              <Text style={[styles.activeTagText, { color: C.warning }]}>Unsettled</Text>
              <TouchableOpacity onPress={() => setShowUnsettled(false)} hitSlop={6}>
                <Ionicons name="close-circle" size={14} color={C.warning} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Status filter chips */}
      {renderFilterChips()}

      {/* Event list or empty state */}
      {processedEvents.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={processedEvents}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
            />
          }
        />
      )}

      {/* Tooltip */}
      {tooltip && (
        <View style={styles.tooltipWrap}>
          <View style={[styles.tooltipBubble, { backgroundColor: C.text }]}>
            <Text style={styles.tooltipText}>{tooltip}</Text>
          </View>
        </View>
      )}

      {/* Filter pane modal */}
      {renderFilterPane()}

      {/* Undo snackbar */}
      <UndoSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        onUndo={handleUndoDelete}
        onDismiss={() => {
          deletedRef.current = null;
          setSnackbar({ visible: false, message: '', data: null });
        }}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 15,
  },

  // ── Header Actions ─────────
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
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },

  // ── Tooltip ────────────────
  tooltipWrap: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  tooltipBubble: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  tooltipText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Search ─────────────────
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.text,
  },

  // ── Active Filter Tags ─────
  activeTagsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 8,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  activeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // ── Filter Chips ───────────
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.white,
  },

  // ── List / Cards ───────────
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
    paddingTop: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statusStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  eventEmoji: {
    fontSize: 20,
  },
  cardHeaderText: {
    flex: 1,
  },
  travelIcons: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 6,
  },
  travelIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  cardBody: {
    marginBottom: 8,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  balanceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceDue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.warning,
  },
  balanceSettled: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.success,
  },

  // ── Swipe Actions ──────────
  swipeActionsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  swipeAction: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  // ── Empty State ────────────
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Filter Pane ────────────
  paneOverlayWrap: {
    flex: 1,
    flexDirection: 'row',
  },
  paneOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  filterPane: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: PANE_WIDTH,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  paneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  paneTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  paneHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.dangerLight,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
  paneBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ── Pane Sections ──────────
  paneSection: {
    marginBottom: 24,
  },
  paneSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  paneSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  paneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginBottom: 6,
  },
  paneOptionActive: {
    backgroundColor: COLORS.infoLight,
  },
  paneOptionUnsettled: {
    backgroundColor: COLORS.warningLight,
  },
  paneOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // ── Pane Month Grid ────────
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  monthCellActive: {
    backgroundColor: COLORS.accent,
  },
  monthCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  monthCellTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },

  // ── Pane Apply ─────────────
  paneApplyBtn: {
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  paneApplyBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
