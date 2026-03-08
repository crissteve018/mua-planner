export const EVENT_TYPES = [
  'Baby Shower',
  'Haldi',
  'Sangeeth',
  'Mehandi',
  'Reception',
  'Engagement',
  'Muhurtham',
  'Cristian Wedding',
  'Nikah',
  'Cocktail',
  'Birthday Party',
  'Half Saree Event',
];

export const EVENT_TYPE_EMOJI = {
  'Baby Shower': '🍼',
  'Haldi': '🌼',
  'Sangeeth': '🎶',
  'Mehandi': '🌿',
  'Reception': '💐',
  'Engagement': '💍',
  'Muhurtham': '🪔',
  'Cristian Wedding': '⛪',
  'Nikah': '🕌',
  'Cocktail': '🍸',
  'Birthday Party': '🎂',
  'Half Saree Event': '👗',
};

export const STATUS_CONFIG = {
  upcoming:  { label: 'Upcoming',  color: '#1565C0', bg: '#E3F2FD', icon: '🔵' },
  completed: { label: 'Completed', color: '#2D8B5F', bg: '#E8F5EE', icon: '🟢' },
  cancelled: { label: 'Cancelled', color: '#C62828', bg: '#FFEBEE', icon: '🔴' },
};

export const MONEY_OPTIONS = [
  { key: 'received',       label: 'Money Received' },
  { key: 'returned',       label: 'Money Returned' },
  { key: 'no_transaction', label: 'No Transaction Required' },
];

export const EXTRA_SERVICES = [
  { key: 'touchup',       label: 'Touchup Required',   countLabel: 'Number of Touchups',    amountLabel: 'Touchup Amount (₹)' },
  { key: 'sareeDrapes',   label: 'Extra Saree Drapes', countLabel: 'Number of Drapes',       amountLabel: 'Drapes Amount (₹)' },
  { key: 'waiting',       label: 'Waiting',            countLabel: 'Hours of Waiting',       amountLabel: 'Waiting Amount (₹)' },
  { key: 'extraMakeup',   label: 'Extra Makeup',       countLabel: 'Number of Extra Makeups', amountLabel: 'Makeup Amount (₹)' },
  { key: 'extraHairdo',   label: 'Extra Hairdo',       countLabel: 'Number of Hairdos',      amountLabel: 'Hairdo Amount (₹)' },
];

// ─── Premium Theme ───────────────────────────
// Inspired by luxury beauty brands — warm, elegant, refined
export const COLORS = {
  // Primary brand — deep plum rose
  primary: '#7B2D52',
  primaryDark: '#5C1D3C',
  primaryLight: '#F2E3EB',
  primaryMuted: '#C88DA6',

  // Accent — rose gold
  accent: '#C9956B',
  accentLight: '#F5EBE0',
  accentDark: '#A87B55',

  // Surfaces
  background: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFCFA',
  card: '#FFFFFF',

  // Text
  text: '#1A1A2E',
  textSecondary: '#5C5C70',
  textMuted: '#9E9EB0',

  // Borders
  border: '#E8E4DF',
  borderLight: '#F0EDE8',

  // Input
  inputBg: '#F7F5F2',

  // Semantic
  success: '#2D8B5F',
  successLight: '#E8F5EE',
  warning: '#D4883E',
  warningLight: '#FFF3E0',
  danger: '#C62828',
  dangerLight: '#FFEBEE',
  info: '#1565C0',
  infoLight: '#E3F2FD',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(26, 26, 46, 0.5)',

  // Tab / Nav
  tabInactive: '#B0AAA3',

  // Section icon background colors
  sectionClient: '#7B2D52',
  sectionEvent: '#C9956B',
  sectionLocation: '#1565C0',
  sectionPricing: '#D4883E',
  sectionExtras: '#6B4C9A',
  sectionNotes: '#2D8B5F',
  sectionCancel: '#C62828',
  sectionMoney: '#5C6BC0',

  // Travel-specific section colors
  sectionTravel: '#00796B',
  sectionFlight: '#1565C0',
  sectionTrain: '#6B4C9A',
  sectionCab: '#D4883E',
  sectionCar: '#2D8B5F',
  sectionBus: '#C62828',
};

// ─── Dark Theme Palette ──────────────────────
export const COLORS_DARK = {
  // Primary brand — deep plum rose (stays similar)
  primary: '#7B2D52',
  primaryDark: '#5C1D3C',
  primaryLight: '#2D1A24',
  primaryMuted: '#8B5A6F',

  // Accent — rose gold (warmer tone on dark)
  accent: '#D4A574',
  accentLight: '#2D2520',
  accentDark: '#E8B88A',

  // Surfaces
  background: '#121218',
  surface: '#1C1C2E',
  surfaceElevated: '#242438',
  card: '#1C1C2E',

  // Text
  text: '#E8E6F0',
  textSecondary: '#A8A6B8',
  textMuted: '#6B6B80',

  // Borders
  border: '#2E2E42',
  borderLight: '#242438',

  // Input
  inputBg: '#242438',

  // Semantic (slightly adjusted for dark bg)
  success: '#3DAF73',
  successLight: '#1A2E22',
  warning: '#E4A04E',
  warningLight: '#2E2818',
  danger: '#E04040',
  dangerLight: '#2E1818',
  info: '#4D9BE8',
  infoLight: '#182838',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Tab / Nav
  tabInactive: '#6B6B80',

  // Section icon background colors (unchanged)
  sectionClient: '#7B2D52',
  sectionEvent: '#C9956B',
  sectionLocation: '#1565C0',
  sectionPricing: '#D4883E',
  sectionExtras: '#6B4C9A',
  sectionNotes: '#2D8B5F',
  sectionCancel: '#C62828',
  sectionMoney: '#5C6BC0',

  // Travel-specific section colors (unchanged)
  sectionTravel: '#00796B',
  sectionFlight: '#1565C0',
  sectionTrain: '#6B4C9A',
  sectionCab: '#D4883E',
  sectionCar: '#2D8B5F',
  sectionBus: '#C62828',
};

// ─── Travel Constants ────────────────────────

export const TRAVEL_MODES = [
  { key: 'flight',  label: 'Flight',   icon: 'airplane',       color: '#1565C0' },
  { key: 'train',   label: 'Train',    icon: 'train',          color: '#6B4C9A' },
  { key: 'cab',     label: 'Cab',      icon: 'car-sport',      color: '#D4883E' },
  { key: 'own_car', label: 'Own Car',  icon: 'car',            color: '#2D8B5F' },
  { key: 'bus',     label: 'Bus',      icon: 'bus',            color: '#C62828' },
];

export const TRAVEL_MODE_MAP = Object.fromEntries(
  TRAVEL_MODES.map(m => [m.key, m])
);

export const TRAVEL_STATUSES = [
  { key: 'planned',   label: 'Planned',   color: '#D4883E', bg: '#FFF3E0', icon: 'time' },
  { key: 'booked',    label: 'Booked',    color: '#1565C0', bg: '#E3F2FD', icon: 'checkmark-circle' },
  { key: 'completed', label: 'Completed', color: '#2D8B5F', bg: '#E8F5EE', icon: 'checkmark-done' },
  { key: 'cancelled', label: 'Cancelled', color: '#C62828', bg: '#FFEBEE', icon: 'close-circle' },
];

export const TRAVEL_STATUS_MAP = Object.fromEntries(
  TRAVEL_STATUSES.map(s => [s.key, s])
);

export const BOOKING_STATUSES = [
  { key: 'not_booked',       label: 'Not Booked' },
  { key: 'booked',           label: 'Booked' },
  { key: 'ticket_received',  label: 'Ticket Received' },
];

// ─── Team Constants ──────────────────────────

export const TEAM_ROLES = [
  { key: 'makeup_artist',   label: 'Makeup Artist',   icon: 'brush',        color: '#D81B60' },
  { key: 'hairstylist',     label: 'Hairstylist',     icon: 'cut',          color: '#8E24AA' },
  { key: 'saree_drapist',   label: 'Saree Drapist',   icon: 'shirt',        color: '#D4883E' },
  { key: 'assistant',       label: 'Assistant',        icon: 'people',       color: '#1565C0' },
  { key: 'driver',          label: 'Driver',           icon: 'car',          color: '#2D8B5F' },
  { key: 'photographer',    label: 'Photographer',     icon: 'camera',       color: '#00796B' },
  { key: 'event_planner',   label: 'Event Planner',    icon: 'clipboard',    color: '#5C6BC0' },
];

export const TEAM_ROLE_MAP = Object.fromEntries(
  TEAM_ROLES.map(r => [r.key, r])
);

export const PAYMENT_STATUSES = [
  { key: 'pending',  label: 'Pending',  color: '#C62828', bg: '#FFEBEE', icon: 'time' },
  { key: 'partial',  label: 'Partial',  color: '#D4883E', bg: '#FFF3E0', icon: 'remove-circle' },
  { key: 'paid',     label: 'Paid',     color: '#2D8B5F', bg: '#E8F5EE', icon: 'checkmark-circle' },
];

export const PAYMENT_STATUS_MAP = Object.fromEntries(
  PAYMENT_STATUSES.map(s => [s.key, s])
);
