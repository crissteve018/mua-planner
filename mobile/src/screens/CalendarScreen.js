import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAllEvents } from '../api/events';
import { COLORS, STATUS_CONFIG, EVENT_TYPE_EMOJI } from '../constants';
import { useTheme } from '../context/SettingsContext';
import MUHURTHAM_DATES from '../constants/muhurthamDates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_MARGIN = 2;
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 32 - 14 * CELL_MARGIN) / 7);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ── Status background colors (mild / pastel) ── */
const STATUS_BG = {
  upcoming:  '#DCEEFB',   // soft blue
  completed: '#D7F0E2',   // soft green
  cancelled: '#FDDEDE',   // soft red
};
const STATUS_COLOR = {
  upcoming:  '#1565C0',
  completed: '#2D8B5F',
  cancelled: '#C62828',
};

/* ── helpers ─────────────────────────────────── */
const toDateKey = (d) => d.toISOString().split('T')[0];

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getEmoji = (type) => EVENT_TYPE_EMOJI[type] || '📅';
const getFirstName = (fullName) => (fullName || '').split(' ')[0];

/* ── determine background color for a date cell ─ */
const getCellBg = (dayEvents) => {
  if (!dayEvents || dayEvents.length === 0) return null;
  const statuses = new Set(dayEvents.map(e => e.status));
  // Single status — one solid color
  if (statuses.size === 1) return STATUS_BG[[...statuses][0]] || STATUS_BG.upcoming;
  // Mixed — return primary status bg
  if (statuses.has('upcoming')) return STATUS_BG.upcoming;
  if (statuses.has('completed')) return STATUS_BG.completed;
  return STATUS_BG.upcoming;
};

/* ── get unique status list for mixed-status indicator ─ */
const getUniqueStatuses = (dayEvents) => {
  if (!dayEvents || dayEvents.length === 0) return [];
  const seen = new Set();
  const result = [];
  dayEvents.forEach(e => {
    if (!seen.has(e.status)) {
      seen.add(e.status);
      result.push(e.status);
    }
  });
  return result;
};

/* ── build calendar grid for a given month ──── */
const buildMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const grid = [];

  for (let i = 0; i < startDow; i++) {
    grid.push({ key: `blank-${i}`, blank: true });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.push({
      key: dateKey,
      day: d,
      date: new Date(year, month, d),
      dateKey,
      isMuhurtham: MUHURTHAM_DATES.has(dateKey),
    });
  }

  return grid;
};

/* ── main component ───────────────────────────── */
export default function CalendarScreen({ navigation }) {
  const today = new Date();
  const C = useTheme();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── fetch all events ───────────────────────── */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await getAllEvents();
          if (res.success) setEvents(res.data);
        } catch (err) {
          console.error('Calendar: error loading events:', err);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  /* ── map events by date ─────────────────────── */
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      if (!ev.eventDate) return;
      const key = ev.eventDate.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  /* ── calendar grid ──────────────────────────── */
  const grid = useMemo(
    () => buildMonthGrid(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  /* ── navigation ─────────────────────────────── */
  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else { setCurrentMonth(m => m - 1); }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else { setCurrentMonth(m => m + 1); }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(toDateKey(today));
  };

  /* ── selected day events ────────────────────── */
  const selectedEvents = eventsByDate[selectedDate] || [];
  const selectedIsMuhurtham = MUHURTHAM_DATES.has(selectedDate);

  /* ── add event with pre-filled date ─────────── */
  const handleAddEvent = () => {
    navigation.navigate('AddEventFromCalendar', { prefilledDate: selectedDate });
  };

  /* ── render day cell ────────────────────────── */
  const renderDay = (item) => {
    if (item.blank) return <View style={styles.dayCellOuter} />;

    const isToday = isSameDay(item.date, today);
    const isSelected = item.dateKey === selectedDate;
    const dayEvents = eventsByDate[item.dateKey] || [];
    const hasEvents = dayEvents.length > 0;
    const cellBg = getCellBg(dayEvents);
    const statuses = getUniqueStatuses(dayEvents);
    const isMixed = statuses.length > 1;

    // Build names label: "Priya" or "Priya +2"
    let namesLabel = '';
    if (hasEvents) {
      const first = getFirstName(dayEvents[0].clientName);
      namesLabel = dayEvents.length === 1 ? first : `${first} +${dayEvents.length - 1}`;
    }

    // Inner cell background logic
    const innerStyle = [styles.dayCellInner, { backgroundColor: C.background }];

    if (isSelected) {
      innerStyle.push({ backgroundColor: C.primary });
    } else if (hasEvents) {
      innerStyle.push({ backgroundColor: cellBg });
    } else if (isToday) {
      innerStyle.push({ backgroundColor: C.primaryLight });
    }

    return (
      <TouchableOpacity
        style={styles.dayCellOuter}
        onPress={() => setSelectedDate(item.dateKey)}
        activeOpacity={0.6}
      >
        <View style={innerStyle}>
          {/* Day number + muhurtham lamp */}
          <View style={styles.dayNumRow}>
            <Text
              style={[
                styles.dayText,
                { color: C.text },
                isToday && !isSelected && { color: C.primary, fontWeight: '800' },
                isSelected && styles.dayTextSelected,
              ]}
            >
              {item.day}
            </Text>
            {item.isMuhurtham && (
              <Text style={styles.cellLamp}>🪔</Text>
            )}
          </View>

          {/* Client name(s) */}
          {hasEvents && !isSelected ? (
            <Text style={[styles.cellName, { color: C.textSecondary }]} numberOfLines={1}>{namesLabel}</Text>
          ) : hasEvents && isSelected ? (
            <Text style={styles.cellNameSelected} numberOfLines={1}>{namesLabel}</Text>
          ) : null}

          {/* Mixed status indicator — small colored bars */}
          {isMixed && !isSelected && (
            <View style={styles.mixedRow}>
              {statuses.map((s) => (
                <View key={s} style={[styles.mixedBar, { backgroundColor: STATUS_COLOR[s] }]} />
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  /* ── render event item in the day detail list ─ */
  const renderEventItem = ({ item }) => {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.upcoming;
    const emoji = getEmoji(item.eventType);

    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: C.card }]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('EventsTab', {
            screen: 'EventDetail',
            params: { eventId: item.id },
          })
        }
      >
        <View style={[styles.eventStrip, { backgroundColor: sc.color }]} />
        <View style={styles.eventContent}>
          <View style={styles.eventTop}>
            <Text style={styles.eventEmoji}>{emoji}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.eventName, { color: C.text }]} numberOfLines={1}>{item.clientName}</Text>
              <Text style={[styles.eventType, { color: C.textSecondary }]}>{item.eventType}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>
          <View style={styles.eventBottom}>
            {item.eventTime ? (
              <View style={styles.eventMeta}>
                <Ionicons name="time-outline" size={13} color={C.textSecondary} />
                <Text style={[styles.eventMetaText, { color: C.textSecondary }]}>{formatTime(item.eventTime)}</Text>
              </View>
            ) : null}
            {item.city ? (
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={13} color={C.textSecondary} />
                <Text style={[styles.eventMetaText, { color: C.textSecondary }]}>{item.city}</Text>
              </View>
            ) : null}
            {item.packageAmount > 0 ? (
              <View style={styles.eventMeta}>
                <Ionicons name="wallet-outline" size={13} color={C.accent} />
                <Text style={[styles.eventMetaText, { color: C.accent, fontWeight: '700' }]}>
                  ₹{Number(item.packageAmount).toLocaleString('en-IN')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} style={{ alignSelf: 'center', marginRight: 10 }} />
      </TouchableOpacity>
    );
  };

  /* ── empty day state ────────────────────────── */
  const renderEmptyDay = () => {
    const [y, m, d] = selectedDate.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
      <View style={styles.emptyDay}>
        <Ionicons name="sunny-outline" size={40} color={C.primaryMuted} />
        <Text style={[styles.emptyDayTitle, { color: C.text }]}>No events</Text>
        <Text style={[styles.emptyDaySubtitle, { color: C.textSecondary }]}>{dayName}</Text>
      </View>
    );
  };

  /* ── month event count ──────────────────────── */
  const monthEventCount = useMemo(() => {
    let count = 0;
    grid.forEach((cell) => {
      if (!cell.blank && eventsByDate[cell.dateKey]) {
        count += eventsByDate[cell.dateKey].length;
      }
    });
    return count;
  }, [grid, eventsByDate]);

  /* ── muhurtham count for month ──────────────── */
  const monthMuhurthamCount = useMemo(() => {
    return grid.filter(c => !c.blank && c.isMuhurtham).length;
  }, [grid]);

  /* ── loading ────────────────────────────────── */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Month Header ────────────────────── */}
      <View style={[styles.monthHeader, { backgroundColor: C.surface }]}>
        <TouchableOpacity onPress={goToPrevMonth} style={[styles.arrowBtn, { backgroundColor: C.primaryLight }]}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
          <View style={styles.monthTitleWrap}>
            <Text style={[styles.monthTitle, { color: C.text }]}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            {monthEventCount > 0 && (
              <View style={[styles.monthBadge, { backgroundColor: C.primary }]}>
                <Text style={styles.monthBadgeText}>{monthEventCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextMonth} style={[styles.arrowBtn, { backgroundColor: C.primaryLight }]}>
          <Ionicons name="chevron-forward" size={22} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Legend Row ──────────────────────── */}
      <View style={[styles.legendRow, { backgroundColor: C.surface }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_BG.upcoming }]} />
          <Text style={[styles.legendText, { color: C.textSecondary }]}>Upcoming</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_BG.completed }]} />
          <Text style={[styles.legendText, { color: C.textSecondary }]}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATUS_BG.cancelled }]} />
          <Text style={[styles.legendText, { color: C.textSecondary }]}>Cancelled</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendLamp}>🪔</Text>
          <Text style={[styles.legendText, { color: C.textSecondary }]}>Muhurtham</Text>
        </View>
      </View>

      {/* ── Weekday Headers ─────────────────── */}
      <View style={[styles.weekRow, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, { color: C.textSecondary }, d === 'Sun' && { color: C.danger }]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Calendar Grid ───────────────────── */}
      <View style={[styles.calendarGrid, { backgroundColor: C.surface }]}>
        {grid.map((item) => (
          <View key={item.key}>{renderDay(item)}</View>
        ))}
      </View>

      {/* ── Muhurtham note (if month has any) ── */}
      {monthMuhurthamCount > 0 && (
        <View style={[styles.muhurthamNote, { backgroundColor: C.surface, borderTopColor: C.borderLight }]}>
          <Text style={styles.muhurthamNoteIcon}>🪔</Text>
          <Text style={[styles.muhurthamNoteText, { color: C.textSecondary }]}>
            {monthMuhurthamCount} muhurtham date{monthMuhurthamCount > 1 ? 's' : ''} this month
          </Text>
        </View>
      )}

      {/* ── Selected Date Label ─────────────── */}
      <View style={styles.selectedDateHeader}>
        <View style={[styles.selectedDateLine, { backgroundColor: C.borderLight }]} />
        <Text style={[styles.selectedDateLabel, { color: C.textSecondary }]}>
          {(() => {
            const [y, m, d] = selectedDate.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            const isToday2 = isSameDay(dateObj, today);
            if (isToday2) return 'Today';
            return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          })()}
        </Text>
        {selectedIsMuhurtham && (
          <View style={styles.muhurthamPill}>
            <Text style={[styles.muhurthamPillText, { color: C.textSecondary }]}>🪔 Muhurtham</Text>
          </View>
        )}
        {selectedEvents.length > 0 && (
          <View style={[styles.countPill, { backgroundColor: C.primary }]}>
            <Text style={styles.countPillText}>{selectedEvents.length}</Text>
          </View>
        )}
        <View style={[styles.selectedDateLine, { backgroundColor: C.borderLight }]} />
      </View>

      {/* ── Day Events List ─────────────────── */}
      <FlatList
        data={selectedEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        ListEmptyComponent={renderEmptyDay}
        contentContainerStyle={
          selectedEvents.length === 0 ? styles.emptyListContent : styles.eventList
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ── FAB: Add Event ──────────────────── */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary }]} activeOpacity={0.85} onPress={handleAddEvent}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

/* ── styles ───────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  /* month header */
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: COLORS.surface,
  },
  arrowBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  monthTitleWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  monthTitle: {
    fontSize: 20, fontWeight: '800', color: COLORS.text,
  },
  monthBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center',
  },
  monthBadgeText: {
    fontSize: 11, fontWeight: '700', color: '#FFF',
  },

  /* legend row */
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: {
    width: 12, height: 12, borderRadius: 3,
  },
  legendLamp: {
    fontSize: 14,
  },
  legendText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },

  /* weekday header */
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  weekDayCell: {
    width: DAY_SIZE + CELL_MARGIN * 2, alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  /* calendar grid */
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: COLORS.surface,
  },
  dayCellOuter: {
    width: DAY_SIZE + CELL_MARGIN * 2,
    height: DAY_SIZE + 12,
    padding: CELL_MARGIN,
  },
  dayCellInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCellToday: {
    backgroundColor: COLORS.primaryLight,
  },
  dayNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  dayText: {
    fontSize: 13, fontWeight: '500', color: COLORS.text,
  },
  dayTextToday: {
    color: COLORS.primary, fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFF', fontWeight: '800',
  },
  cellLamp: {
    fontSize: 8,
    marginTop: -2,
  },

  /* cell name labels */
  cellName: {
    fontSize: 7,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 0,
    maxWidth: DAY_SIZE - 4,
    textAlign: 'center',
  },
  cellNameSelected: {
    fontSize: 7,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 0,
    maxWidth: DAY_SIZE - 4,
    textAlign: 'center',
  },

  /* mixed status bars */
  mixedRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  mixedBar: {
    width: 10,
    height: 3,
    borderRadius: 1.5,
  },

  /* muhurtham note */
  muhurthamNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 5,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  muhurthamNoteIcon: { fontSize: 13 },
  muhurthamNoteText: {
    fontSize: 11, fontWeight: '600', color: COLORS.textSecondary,
  },

  /* selected date header */
  selectedDateHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  selectedDateLine: {
    flex: 1, height: 1, backgroundColor: COLORS.borderLight,
  },
  selectedDateLabel: {
    fontSize: 14, fontWeight: '700', color: COLORS.textSecondary,
  },
  muhurthamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  muhurthamPillText: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
  },
  countPill: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center',
  },
  countPillText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  /* event list */
  eventList: { paddingHorizontal: 16, paddingBottom: 80 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },

  /* event card */
  eventCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  eventStrip: { width: 4 },
  eventContent: { flex: 1, padding: 14 },
  eventTop: { flexDirection: 'row', alignItems: 'center' },
  eventEmoji: { fontSize: 24 },
  eventName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  eventBottom: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10,
  },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText: { fontSize: 12, color: COLORS.textSecondary },

  /* empty day */
  emptyDay: { alignItems: 'center', paddingHorizontal: 40 },
  emptyDayTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyDaySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
