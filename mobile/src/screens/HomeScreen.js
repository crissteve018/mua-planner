import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getDashboard } from '../api/dashboard';
import { useTheme } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { COLORS, EVENT_TYPE_EMOJI, TRAVEL_MODE_MAP } from '../constants';

export default function HomeScreen({ navigation }) {
  const C = useTheme();
  const { user, updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getDashboard();
      if (res.success) setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  // ── Pick Profile Image ──
  const pickImage = async () => {
    // Show confirmation dialog first
    Alert.alert(
      'Add Profile Photo',
      'MUA Planner would like to access your photo library to set your profile picture.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Allow', 
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  'Permission Denied', 
                  'Please enable photo access in Settings to set a profile picture.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                  ]
                );
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.3,
                base64: true,
              });

              if (!result.canceled && result.assets[0]) {
                setUploadingImage(true);
                const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                const res = await updateUser({ profileImage: base64Image });
                if (!res.success) {
                  Alert.alert('Error', 'Failed to update profile picture. Please try again.');
                }
                setUploadingImage(false);
              }
            } catch (err) {
              console.error('Image picker error:', err);
              setUploadingImage(false);
              Alert.alert('Error', 'Failed to pick image');
            }
          }
        }
      ]
    );
  };

  // ── Get user's first name ──
  const getFirstName = () => {
    if (!user?.name) return 'Artist';
    const firstName = user.name.split(' ')[0];
    return firstName || 'Artist';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `in ${diff} days`;
  };

  const formatCurrency = (amount) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN');
  };

  if (loading && !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const { todayEvents = [], upcomingEvents = [], stats = {}, travelAlerts = [] } = data || {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} tintColor={C.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Greeting Header ── */}
      <View style={[styles.greetingCard, { backgroundColor: C.primary }]}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>Hey, {getFirstName()} ✨</Text>
            <Text style={styles.dateText}>{formatDate()}</Text>
          </View>
          <TouchableOpacity 
            onPress={pickImage} 
            activeOpacity={0.8}
            disabled={uploadingImage}
          >
            <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : user?.profileImage ? (
                <Image 
                  source={{ uri: user.profileImage }} 
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={24} color="rgba(255,255,255,0.6)" />
                  <View style={styles.addIconBadge}>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Quick Stats ── */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.statIcon, { backgroundColor: C.infoLight }]}>
            <Ionicons name="calendar" size={18} color={C.info} />
          </View>
          <Text style={[styles.statValue, { color: C.text }]}>{stats.monthEvents || 0}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>This Month</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.statIcon, { backgroundColor: C.successLight }]}>
            <Ionicons name="cash" size={18} color={C.success} />
          </View>
          <Text style={[styles.statValue, { color: C.text }]}>{formatCurrency(stats.monthEarnings)}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Earnings</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.statIcon, { backgroundColor: C.warningLight }]}>
            <Ionicons name="time" size={18} color={C.warning} />
          </View>
          <Text style={[styles.statValue, { color: C.text }]}>{formatCurrency(stats.pendingPayments)}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Pending</Text>
        </View>
      </View>

      {/* ── Today's Schedule ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Today's Schedule</Text>
          <View style={[styles.badge, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.badgeText, { color: C.primary }]}>{todayEvents.length}</Text>
          </View>
        </View>

        {todayEvents.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="sunny-outline" size={36} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No events today</Text>
            <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>Enjoy your free day!</Text>
          </View>
        ) : (
          todayEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventCard, { backgroundColor: C.surface, borderColor: C.border }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EventsTab', {
                screen: 'EventDetail',
                params: { eventId: event.id },
              })}
            >
              <View style={[styles.eventEmoji, { backgroundColor: C.primaryLight }]}>
                <Text style={styles.emojiText}>{EVENT_TYPE_EMOJI[event.eventType] || '💄'}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventClient, { color: C.text }]}>{event.clientName}</Text>
                <Text style={[styles.eventType, { color: C.textSecondary }]}>{event.eventType}</Text>
                {event.city ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={12} color={C.textMuted} />
                    <Text style={[styles.locationText, { color: C.textMuted }]}>{event.city}</Text>
                  </View>
                ) : null}
              </View>
              {event.eventTime ? (
                <View style={[styles.timeBadge, { backgroundColor: C.infoLight }]}>
                  <Ionicons name="time-outline" size={12} color={C.info} />
                  <Text style={[styles.timeText, { color: C.info }]}>{event.eventTime}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* ── Upcoming Events ── */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Upcoming</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EventsTab')}>
              <Text style={[styles.seeAll, { color: C.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.upcomingCard, { backgroundColor: C.surface, borderColor: C.border }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EventsTab', {
                screen: 'EventDetail',
                params: { eventId: event.id },
              })}
            >
              <View style={styles.upcomingLeft}>
                <View style={[styles.datePill, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.datePillText, { color: C.primary }]}>
                    {formatEventDate(event.eventDate)}
                  </Text>
                </View>
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={[styles.eventClient, { color: C.text }]} numberOfLines={1}>
                  {EVENT_TYPE_EMOJI[event.eventType] || '💄'} {event.clientName}
                </Text>
                <Text style={[styles.eventType, { color: C.textSecondary }]}>
                  {event.eventType} • {event.city || 'TBD'}
                </Text>
              </View>
              <View style={styles.upcomingRight}>
                <Text style={[styles.countdownText, { color: C.accent }]}>
                  {getDaysUntil(event.eventDate)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Travel Alerts ── */}
      {travelAlerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Travel Alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EventsTab')}>
              <Text style={[styles.seeAll, { color: C.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {travelAlerts.map((t) => {
            const mode = TRAVEL_MODE_MAP[t.travelMode];
            return (
              <View
                key={t.id}
                style={[styles.travelCard, { backgroundColor: C.surface, borderColor: C.border }]}
              >
                <View style={[styles.travelIcon, { backgroundColor: (mode?.color || C.info) + '18' }]}>
                  <Ionicons name={mode?.icon || 'airplane'} size={18} color={mode?.color || C.info} />
                </View>
                <View style={styles.travelInfo}>
                  <Text style={[styles.eventClient, { color: C.text }]} numberOfLines={1}>
                    {t.clientName} — {t.eventType}
                  </Text>
                  <Text style={[styles.eventType, { color: C.textSecondary }]}>
                    {mode?.label || t.travelMode} • {formatEventDate(t.travelDate)}
                  </Text>
                </View>
                <View style={[styles.alertBadge, {
                  backgroundColor: t.bookingStatus === 'not_booked' ? C.warningLight : C.infoLight,
                }]}>
                  <Text style={[styles.alertBadgeText, {
                    color: t.bookingStatus === 'not_booked' ? C.warning : C.info,
                  }]}>
                    {t.bookingStatus === 'not_booked' ? 'Not Booked' : 'Planned'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Quick Overview ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Overview</Text>
        <View style={[styles.overviewCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <View style={[styles.overviewDot, { backgroundColor: C.info }]} />
              <Text style={[styles.overviewLabel, { color: C.textSecondary }]}>Upcoming</Text>
              <Text style={[styles.overviewValue, { color: C.text }]}>{stats.totalUpcoming || 0}</Text>
            </View>
            <View style={[styles.overviewDivider, { backgroundColor: C.border }]} />
            <View style={styles.overviewItem}>
              <View style={[styles.overviewDot, { backgroundColor: C.success }]} />
              <Text style={[styles.overviewLabel, { color: C.textSecondary }]}>Completed</Text>
              <Text style={[styles.overviewValue, { color: C.text }]}>{stats.totalCompleted || 0}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── My Team ── */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeaderRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ManageTeam')}
        >
          <Text style={[styles.sectionTitle, { color: C.text }]}>My Team</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.seeAll, { color: C.primary }]}>Manage</Text>
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.myTeamCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('ManageTeam')}
        >
          <View style={[styles.myTeamIcon, { backgroundColor: '#8E24AA18' }]}>
            <Ionicons name="people" size={22} color="#8E24AA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.myTeamTitle, { color: C.text }]}>Team Contacts</Text>
            <Text style={[styles.myTeamHint, { color: C.textSecondary }]}>Save your frequent team members for quick access</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Greeting
  greetingCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 24,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  // Today event card
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  eventEmoji: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 20,
  },
  eventInfo: {
    flex: 1,
  },
  eventClient: {
    fontSize: 15,
    fontWeight: '700',
  },
  eventType: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Upcoming card
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  upcomingLeft: {
    marginRight: 12,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Travel alert card
  travelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  travelIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  travelInfo: {
    flex: 1,
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Overview
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  overviewDivider: {
    width: 1,
    height: 50,
    marginHorizontal: 16,
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // My Team
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontWeight: '600' },
  myTeamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  myTeamIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myTeamTitle: { fontSize: 15, fontWeight: '700' },
  myTeamHint: { fontSize: 12, marginTop: 2 },
});
