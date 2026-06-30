import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getContactPayments } from '../api/team';
import { TEAM_ROLE_MAP } from '../constants';
import { useTheme } from '../context/SettingsContext';

export default function TeamContactDetailScreen({ route }) {
  const C = useTheme();
  const { contactId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await getContactPayments(contactId);
          if (res.success) setData(res.data);
        } catch (err) {
          console.error('Error fetching contact payments:', err);
        } finally {
          setLoading(false);
        }
      })();
    }, [contactId])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.textMuted} />
        <Text style={[styles.emptyText, { color: C.textSecondary }]}>Could not load details.</Text>
      </View>
    );
  }

  const { contact, events, totalAmount, totalPaid, pendingBalance } = data;
  const ri = TEAM_ROLE_MAP[contact.defaultRole];

  const renderEvent = ({ item }) => {
    const eri = TEAM_ROLE_MAP[item.teamRole];
    const pending = (item.amount || 0) - (item.amountPaid || 0);
    const isPaid = item.paymentStatus === 'paid';
    const isPartial = item.paymentStatus === 'partial';

    return (
      <View style={[styles.eventCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
        <View style={styles.eventHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eventName, { color: C.text }]}>{item.eventName || 'Unknown Event'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {item.eventType ? (
                <Text style={[styles.eventMeta, { color: C.textMuted }]}>{item.eventType}</Text>
              ) : null}
              {item.eventDate ? (
                <Text style={[styles.eventMeta, { color: C.textMuted }]}>
                  · {new Date(item.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              ) : null}
              {item.eventCity ? (
                <Text style={[styles.eventMeta, { color: C.textMuted }]}>· {item.eventCity}</Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.statusBadge, {
            backgroundColor: isPaid ? '#4CAF5018' : isPartial ? '#FF980018' : '#FF6B6B18',
          }]}>
            <Text style={[styles.statusText, {
              color: isPaid ? '#4CAF50' : isPartial ? '#FF9800' : '#FF6B6B',
            }]}>
              {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={[styles.paymentRow, { borderTopColor: C.borderLight }]}>
          <View style={styles.paymentCol}>
            <Text style={[styles.paymentLabel, { color: C.textMuted }]}>Role</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={eri?.icon || 'person'} size={13} color={eri?.color || C.textSecondary} />
              <Text style={[styles.paymentValue, { color: eri?.color || C.text }]}>{eri?.label || item.teamRole}</Text>
            </View>
          </View>
          <View style={styles.paymentCol}>
            <Text style={[styles.paymentLabel, { color: C.textMuted }]}>Total</Text>
            <Text style={[styles.paymentValue, { color: C.text }]}>₹{(item.amount || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.paymentCol}>
            <Text style={[styles.paymentLabel, { color: C.textMuted }]}>Paid</Text>
            <Text style={[styles.paymentValue, { color: '#4CAF50' }]}>₹{(item.amountPaid || 0).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.paymentCol}>
            <Text style={[styles.paymentLabel, { color: C.textMuted }]}>Due</Text>
            <Text style={[styles.paymentValue, { color: pending > 0 ? '#FF6B6B' : '#4CAF50' }]}>
              ₹{pending.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* ── Contact Header ── */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
        <View style={[styles.headerIcon, { backgroundColor: (ri?.color || '#999') + '18' }]}>
          {ri?.image ? (
            <Image source={ri.image} style={styles.headerIconImage} />
          ) : (
            <Ionicons name={ri?.icon || 'person'} size={28} color={ri?.color || '#999'} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerName, { color: C.text }]}>{contact.name}</Text>
          <Text style={[styles.headerRole, { color: ri?.color || C.textSecondary }]}>
            {ri?.label || contact.defaultRole}
            {contact.phone ? `  ·  ${contact.phone}` : ''}
          </Text>
          {contact.email ? (
            <Text style={[styles.headerEmail, { color: C.textMuted }]}>{contact.email}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Summary Cards ── */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Ionicons name="calendar-outline" size={18} color={C.primary} />
          <Text style={[styles.summaryValue, { color: C.text }]}>{events.length}</Text>
          <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Events</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
          <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Total Paid</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Ionicons name="time-outline" size={18} color="#FF6B6B" />
          <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>₹{pendingBalance.toLocaleString('en-IN')}</Text>
          <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Pending</Text>
        </View>
      </View>

      {/* ── Event List ── */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          events.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>Events Worked</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={40} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>No events yet</Text>
            <Text style={[styles.emptyHint, { color: C.textMuted }]}>
              This contact hasn't been added to any event team yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  headerIconImage: { width: 32, height: 32, resizeMode: 'contain' },
  headerName: { fontSize: 18, fontWeight: '800' },
  headerRole: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  headerEmail: { fontSize: 12, marginTop: 2 },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  summaryCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, gap: 4,
  },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },

  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  list: { padding: 16, paddingBottom: 32 },

  eventCard: {
    borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden',
  },
  eventHeader: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10,
  },
  eventName: { fontSize: 15, fontWeight: '700' },
  eventMeta: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  paymentRow: {
    flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  paymentCol: { flex: 1, gap: 2 },
  paymentLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  paymentValue: { fontSize: 13, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyHint: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
