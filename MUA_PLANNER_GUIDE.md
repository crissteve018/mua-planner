# MUA Planner — Technical Guide

> A professional event planning app built for Makeup Artists (MUAs) to manage bookings, team, travel, and finances — all in one place.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [App Architecture & Navigation](#4-app-architecture--navigation)
5. [Authentication System](#5-authentication-system)
6. [State Management & Contexts](#6-state-management--contexts)
7. [API Layer & Data Flow](#7-api-layer--data-flow)
8. [Screens & Features](#8-screens--features)
9. [Constants & Configuration](#9-constants--configuration)
10. [Theming & UI System](#10-theming--ui-system)
11. [Security Implementation](#11-security-implementation)
12. [Privacy & Data Handling](#12-privacy--data-handling)
13. [Backend Overview](#13-backend-overview)

---

## 1. Project Overview

**MUA Planner** is a React Native mobile app (iOS-first) designed specifically for professional Makeup Artists. It helps them:

- Track and manage booking events (weddings, engagements, parties, etc.)
- Manage team members assigned to each event
- Track travel logistics
- Monitor payments and financials
- View upcoming bookings on an interactive calendar (with Hindu Muhurtham dates highlighted)
- Configure app appearance and personal preferences

The app is backed by a shared REST API server also used by the macOS SwiftUI version of the app.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React Native | 0.83.2 |
| Build Tool | Expo | ~55.0.4 |
| Language | JavaScript (ES2022+) | — |
| UI Library | React | 19.2.0 |
| Navigation | React Navigation | v7 |
| HTTP Client | Axios | ^1.13.6 |
| Local Storage | AsyncStorage | 2.2.0 |
| Date Picker | @react-native-community/datetimepicker | 8.6.0 |
| Picker | @react-native-picker/picker | 2.11.4 |
| Gestures | react-native-gesture-handler | ~2.30.0 |
| Animations | react-native-reanimated | 4.2.1 |
| Safe Area | react-native-safe-area-context | ~5.6.2 |
| Screen Mgmt | react-native-screens | ~4.23.0 |
| Icons | @expo/vector-icons (Ionicons) | ^15.0.2 |
| Contacts | expo-contacts | ~55.0.14 |
| Haptics | expo-haptics | ~55.0.8 |
| Image Picker | expo-image-picker | ~55.0.11 |
| Status Bar | expo-status-bar | ~55.0.4 |

### Backend
- **URL:** `https://mua-planner1.onrender.com`
- **Hosting:** Render (free tier, shared with macOS app)
- **Protocol:** HTTPS enforced

---

## 3. Project Structure

```
muaplanner_app/
├── App.js                    # Root component — navigation, providers, auth gate
├── index.js                  # Expo entry point
├── app.json                  # Expo config (app name, icons, splash, bundle ID)
├── eas.json                  # EAS Build config
├── package.json
├── assets/
│   └── icons/
├── ios/                      # Native iOS project (Xcode)
│   ├── Podfile
│   └── MUAPlanner/           # Swift native files
└── src/
    ├── api/                  # All HTTP API calls
    │   ├── config.js         # Base URL config + HTTPS warning
    │   ├── events.js         # Axios instance + Events API
    │   ├── auth.js           # Authentication API
    │   ├── dashboard.js      # Dashboard summary API
    │   ├── team.js           # Team members & contacts API
    │   ├── travel.js         # Travel API
    │   └── settings.js       # Settings, feedback, clear data API
    ├── components/           # Reusable UI components
    │   ├── AutocompleteInput.js   # Country/state autocomplete field
    │   ├── SplashScreen.js        # Custom animated splash
    │   └── UndoSnackbar.js        # Undo delete snackbar
    ├── constants/
    │   ├── index.js          # Event types, emojis, statuses, colors, services
    │   ├── locations.js      # Countries + States data for autocomplete
    │   └── muhurthamDates.js # Hindu auspicious marriage dates (2025+)
    ├── context/
    │   ├── AuthContext.js    # User session state, signIn/signOut/updateUser
    │   └── SettingsContext.js # App settings, theme, dark mode
    └── screens/              # One file per screen
        ├── LoginScreen.js
        ├── SignUpScreen.js
        ├── OTPVerificationScreen.js
        ├── DualOTPScreen.js
        ├── HomeScreen.js
        ├── EventListScreen.js
        ├── EventDetailScreen.js
        ├── AddEventScreen.js
        ├── EditEventScreen.js
        ├── CancelEventScreen.js
        ├── CalendarScreen.js
        ├── AddTravelScreen.js
        ├── EditTravelScreen.js
        ├── TravelListScreen.js
        ├── TravelDetailScreen.js
        ├── AddTeamScreen.js
        ├── EditTeamScreen.js
        ├── ManageTeamScreen.js
        ├── TeamContactDetailScreen.js
        ├── SettingsScreen.js
        └── PrivacyPolicyScreen.js
```

---

## 4. App Architecture & Navigation

### Provider Hierarchy

```
GestureHandlerRootView
  └── AuthProvider          (user session)
        └── SettingsProvider  (theme, preferences)
              └── NavigationContainer
                    └── AppNavigator (auth gate)
```

The app renders a **custom SplashScreen** while `AuthContext` is loading the session. Once auth loading is done, it shows either:
- `AuthStack` — if no user session found
- `MainTabs` — if user is logged in

### Navigation Tree

```
AuthStack
  ├── Login
  ├── SignUp
  ├── OTPVerification
  └── DualOTP

MainTabs (Bottom Tab Navigator)
  ├── HomeStack
  │     ├── Home
  │     ├── ManageTeam
  │     └── TeamContactDetail
  ├── EventsStack
  │     ├── EventList
  │     ├── EventDetail
  │     ├── AddEvent (modal)
  │     ├── EditEvent
  │     ├── CancelEvent (modal)
  │     ├── AddTravel (modal)
  │     ├── EditTravel
  │     ├── AddTeam (modal)
  │     └── EditTeam
  ├── CalendarStack
  │     ├── Calendar
  │     └── AddEventFromCalendar (modal)
  └── SettingsStack
        ├── Settings
        └── PrivacyPolicy
```

Bottom tab icons use **Ionicons** from `@expo/vector-icons`. Tab bar appearance adapts to the active theme color and dark/light mode.

---

## 5. Authentication System

### Sign Up Flow

1. User fills: Full Name, Email, Phone (+91 default), Password (min 8 chars), Confirm Password
2. Client validates all fields with inline checks before calling API
3. `POST /api/auth/register` is called → server sends OTP to both email and phone
4. User is navigated to `DualOTPScreen` with masked email/phone shown for UX
5. `POST /api/auth/register/verify` with both OTP codes → account created
6. `signIn()` called → session stored

### Login Modes (3 Options)

| Mode | Flow |
|---|---|
| **Password** | Email + Password → `POST /api/auth/login/password` |
| **Email OTP** | Email → `POST /api/auth/login` → OTP to email → `OTPVerificationScreen` → `POST /api/auth/login/verify` |
| **Phone OTP** | Phone → `POST /api/auth/phone/send` → OTP to phone → `OTPVerificationScreen` |

### Session Management (`AuthContext`)

- Session is stored in `AsyncStorage` under key `@mua_planner_auth`
- On every app launch, the stored session is read and validated:
  1. **Expiry check** — sessions older than 30 days are cleared automatically
  2. **Server verify** — `GET /api/auth/me/:email` is called to confirm account still exists
  3. **404 → clear** — if user was deleted from server, local session is cleared
  4. **Network error → fallback** — if server is unreachable, cached session is used (offline support)
- `X-User-Id` header is set on the shared Axios instance immediately after session restore

### Session Storage Format

```json
{
  "id": "user_id",
  "name": "MUA Name",
  "email": "mua@example.com",
  "phone": "+91XXXXXXXXXX",
  "loginTime": "2025-01-01T00:00:00.000Z"
}
```

### Auth Context API

| Method | Description |
|---|---|
| `user` | Current user object (null if logged out) |
| `loading` | True during session restore on launch |
| `signIn(userData)` | Stores session, sets userId header |
| `signOut()` | Clears AsyncStorage, removes userId header |
| `updateUser(updates)` | Calls `PUT /api/auth/profile`, updates local session |

---

## 6. State Management & Contexts

The app uses **React Context API** — no Redux or Zustand.

### AuthContext (`src/context/AuthContext.js`)

Manages who is logged in. Consumed by:
- `App.js` — to decide which navigator to show
- `SettingsContext` — to know when to load settings
- `HomeScreen` — to display user's first name
- `SettingsScreen` — to show account info, trigger sign-out

### SettingsContext (`src/context/SettingsContext.js`)

Manages user preferences synced with the backend. Only loads **after** auth is complete.

**Default settings:**

| Key | Default | Description |
|---|---|---|
| `themeColor` | `#7B2D52` (Plum) | Primary brand color |
| `colorMode` | `light` | light / dark / system |
| `fontSize` | `medium` | small / medium / large |
| `notificationsEnabled` | `false` | Push notifications toggle |
| `notifyBefore` | `60` | Minutes before event to notify |
| `passcodeLock` | `false` | App-level passcode lock |
| `passcode` | `''` | 4-digit PIN |
| `mapsEnabled` | `true` | Maps integration toggle |

**`isDark`** — computed from `colorMode`:
- `light` → always light
- `dark` → always dark
- `system` → follows device `useColorScheme()`

**`theme`** — computed color palette from `COLORS` or `COLORS_DARK` based on `isDark`, with `primary` overridden by `themeColor`.

**Optimistic updates** — `updateSettings()` applies changes locally first, then syncs to server. If server fails, the local state is still shown (no rollback).

**Exported hooks:**
- `useSettings()` — full settings context
- `useTheme()` — returns the active color palette (shorthand for `useSettings().theme`)

---

## 7. API Layer & Data Flow

### Axios Instance (`src/api/events.js`)

A single shared Axios instance is created with:
- `baseURL`: from `config.js`
- `timeout`: 10 seconds
- `Content-Type: application/json`
- **Request interceptor** that blocks non-HTTPS requests in production

All other API files import this instance (`import api from './events'`), so they all share the same base config, timeout, and security interceptor.

### User Identity

After login, `setApiUserId(userId)` adds the header:
```
X-User-Id: <user_id>
```
This header scopes all data requests to the authenticated user on the backend.

### API Endpoints Reference

#### Authentication (`src/api/auth.js`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Initiate sign up (sends OTP) |
| POST | `/api/auth/verify` | Verify sign up OTP |
| POST | `/api/auth/login` | Initiate email OTP login |
| POST | `/api/auth/login/verify` | Verify email OTP login |
| POST | `/api/auth/login/password` | Login with password |
| POST | `/api/auth/resend` | Resend OTP (login or signup) |
| GET | `/api/auth/me/:email` | Verify session / get profile |
| PUT | `/api/auth/profile` | Update user profile |
| POST | `/api/auth/phone/send` | Send OTP to phone |
| POST | `/api/auth/phone/verify` | Verify phone OTP |
| POST | `/api/auth/register` | Full registration (email+phone) |
| POST | `/api/auth/register/verify` | Verify dual OTP registration |

#### Events (`src/api/events.js`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/events` | List all events (supports params) |
| GET | `/api/events/:id` | Get single event |
| POST | `/api/events` | Create new event |
| PUT | `/api/events/:id` | Edit event |
| PUT | `/api/events/:id/cancel` | Cancel event with reason |
| PUT | `/api/events/:id/complete` | Mark event as completed |
| PUT | `/api/events/:id/restore` | Restore cancelled event |
| DELETE | `/api/events/:id` | Delete event |
| POST | `/api/events/restore` | Undo delete (restore with data) |

#### Travel (`src/api/travel.js`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/travel` | List all travel records |
| GET | `/api/travel/:id` | Get single travel record |
| GET | `/api/travel/summary/:eventId` | Travel linked to an event |
| POST | `/api/travel` | Add travel record |
| PUT | `/api/travel/:id` | Update travel record |
| DELETE | `/api/travel/:id` | Delete travel record |

#### Team (`src/api/team.js`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/team/summary/:eventId` | Team members for an event |
| GET | `/api/team/:id` | Get single team member |
| POST | `/api/team` | Add team member to event |
| PUT | `/api/team/:id` | Edit team member |
| DELETE | `/api/team/:id` | Remove team member |
| GET | `/api/team-contacts` | Frequent/saved team contacts |
| POST | `/api/team-contacts` | Create team contact |
| PUT | `/api/team-contacts/:id` | Update team contact |
| DELETE | `/api/team-contacts/:id` | Delete team contact |
| GET | `/api/team-contacts/:id/payments` | Payment history for a contact |

#### Dashboard (`src/api/dashboard.js`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Summary: upcoming events, earnings, team |

#### Settings (`src/api/settings.js`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/settings` | Fetch user settings |
| PUT | `/api/settings` | Save user settings |
| POST | `/api/feedback` | Submit feedback |
| DELETE | `/api/data/clear` | Clear all user data |

### Data Flow Diagram

```
App Launch
    │
    ▼
AuthContext restores session
    │
    ├── No session / expired ──────────► AuthStack (Login)
    │
    └── Session found
            │
            ▼
        Verify with server (GET /api/auth/me/:email)
            │
            ├── 404 → clear session → AuthStack
            ├── Network error → use cached session
            └── OK → MainTabs
                    │
                    ▼
                SettingsContext loads (GET /api/settings)
                    │
                    ▼
                Theme + preferences applied
```

---

## 8. Screens & Features

### Home Screen
- Greets user by first name
- Calls `GET /api/dashboard` on every focus (`useFocusEffect`)
- Displays: upcoming events count, today's events, recent bookings, earnings summary
- Pull-to-refresh supported
- Quick-access card to Manage Team

### Event List Screen
- Lists all events via `GET /api/events`
- **Filters:** All / Upcoming / Completed / Cancelled
- **Sort:** by date toggle
- **Filter by month** (Jan–Dec picker)
- **Show Unsettled** — filter events with pending payments
- **Search:** by client name, event type, city
- **Swipe to delete** (with undo snackbar — 5s window to undo)
- **Swipe to complete** (mark as completed)
- **Filter pane** slides in from right (72% screen width)
- Each event card shows: emoji, type, client name, date, status badge, city

### Event Detail Screen
- Full event info: client, type, date, time, location, payment status
- Extra services breakdown (touchups, saree drapes, waiting, etc.)
- Linked travel summary
- Linked team members
- Actions: Edit, Cancel, Complete, Delete

### Add / Edit Event Screen
- Fields: Client Name, Phone, Alt Phone, Email, Event Type, Date, Time, Country, State, City, Address
- Country + State use `AutocompleteInput` (filtered dropdown)
- Extra services toggles with count + amount inputs
- Payment section: amount, money status (received / returned / no transaction)
- Maps integration — generates Google Maps URL from address fields
- Date + Time use native `DateTimePicker`

### Cancel Event Screen
- Captures cancellation reason before marking event cancelled
- Calls `PUT /api/events/:id/cancel`

### Calendar Screen
- Full custom calendar built without a calendar library
- 7-column grid, month navigation (prev/next)
- **Muhurtham dates** highlighted with a gold dot indicator (auspicious Hindu marriage dates)
- Event dots on days that have bookings, color-coded by status:
  - Blue: Upcoming
  - Green: Completed
  - Red: Cancelled
- Tap a day → shows list of events for that day below the calendar
- Header action to jump to Add Event with prefilled date

### Travel Screens
- Add/Edit travel: mode (flight, train, car, etc.), from/to, date, cost, notes
- Travel summary shown within Event Detail
- Standalone Travel List + Travel Detail screens

### Team Screens
- **Manage Team:** lists saved frequent team contacts
- **Team Contact Detail:** shows all events that person worked, payment history
- **Add/Edit Team (per event):** assign a contact to an event with role + payment details
- Two-tier system:
  - **Team Contacts** — reusable saved people (address book style)
  - **Team Members** — a contact assigned to a specific event

### Settings Screen
- **Theme Color** — 6 swatches: Plum, Emerald, Royal, Purple, Sienna, Charcoal
- **Color Mode** — Light / Dark / System
- **Font Size** — Small / Medium / Large
- **Notifications** — toggle + notify-before time picker
- **Passcode Lock** — enable 4-digit PIN protection, set/change/disable PIN
- **Maps Integration** — toggle
- **Feedback** — subject + message form → `POST /api/feedback`
- **Clear All Data** — wipes all user data from server
- **Sign Out**
- **Privacy Policy** link → `PrivacyPolicyScreen`

All settings are **saved to server** via `PUT /api/settings`, with optimistic local updates for snappy UX.

---

## 9. Constants & Configuration

### Event Types (`src/constants/index.js`)

| Type | Emoji |
|---|---|
| Baby Shower | 🍼 |
| Haldi | 🌼 |
| Sangeeth | 🎶 |
| Mehandi | 🌿 |
| Reception | 💐 |
| Engagement | 💍 |
| Muhurtham | 🪔 |
| Cristian Wedding | ⛪ |
| Nikah | 🕌 |
| Cocktail | 🍸 |
| Birthday Party | 🎂 |
| Half Saree Event | 👗 |

### Event Statuses

| Status | Color | Background |
|---|---|---|
| upcoming | #1565C0 | #E3F2FD |
| completed | #2D8B5F | #E8F5EE |
| cancelled | #C62828 | #FFEBEE |

### Extra Services

| Key | Label |
|---|---|
| `touchup` | Touchup Required |
| `sareeDrapes` | Extra Saree Drapes |
| `waiting` | Waiting |
| `extraMakeup` | Extra Makeup |
| `extraHairdo` | Extra Hairdo |

Each extra service has a count and an amount field.

### Money Options

- `received` — Money Received
- `returned` — Money Returned
- `no_transaction` — No Transaction Required

### Locations (`src/constants/locations.js`)

- Full list of countries (100+ countries)
- Indian states + Union Territories
- US states
- Used by `AutocompleteInput` in Add/Edit Event screens
- `generateMapsUrl(address)` helper to create Google Maps deep link

### Muhurtham Dates (`src/constants/muhurthamDates.js`)

- `Set` of ISO date strings (e.g. `'2025-04-18'`)
- Covers 2025+ Hindu auspicious marriage dates from the Hindu Panchang calendar
- Used only by `CalendarScreen` to render gold dots on those days
- Helps MUAs anticipate peak wedding season dates

---

## 10. Theming & UI System

### Color Palette (Light)

| Token | Value | Usage |
|---|---|---|
| `primary` | `#7B2D52` (Plum) | Brand color, buttons, accents |
| `primaryDark` | `#5C1D3C` | Pressed state |
| `primaryLight` | `#F2E3EB` | Light tinted backgrounds |
| `accent` | `#C9956B` | Rose gold highlights |
| `background` | `#FAF8F5` | Screen background |
| `surface` | `#FFFFFF` | Cards, sheets |
| `text` | `#1A1A2E` | Primary text |
| `textSecondary` | `#5C5C70` | Labels, subtitles |
| `textMuted` | `#9E9EB0` | Placeholders, hints |
| `border` | `#E8E4DF` | Dividers, input borders |
| `success` | `#2D8B5F` | Completed status |
| `danger` | `#C62828` | Cancelled, errors, delete |
| `warning` | `#D4883E` | Warnings |
| `info` | `#1565C0` | Upcoming, info states |

Dark mode equivalents are in `COLORS_DARK`.

### Dynamic Theme

- The `primary` color can be overridden by the user's chosen `themeColor` setting
- Validated as a proper 6-digit hex before applying (prevents blank/invalid colors)
- All screens consume colors via `const C = useTheme()` hook

### Login / SignUp screens use a separate dark luxury palette:
- Background: `#0F0F0F`
- Card: `#1C1C1C`
- Input: `#272727`
- Gold: `#C9A84C`
- Text: `#F5F0E8`

This gives the auth screens a premium dark brand feel distinct from the main app.

---

## 11. Security Implementation

### HTTPS Enforcement (Two Layers)

**Layer 1 — Config check** (`src/api/config.js`):
- In production (`!__DEV__`): logs a warning if `API_BASE_URL` is not HTTPS
- In dev: logs informational message for non-HTTPS URLs

**Layer 2 — Request interceptor** (`src/api/events.js`):
- Every outgoing Axios request is checked before it fires
- In production: if URL starts with `http://`, the request is **rejected** with an error
- Prevents accidental downgrade attacks or misconfiguration

### User Scoping

- Every API request carries `X-User-Id` header (set via `setApiUserId()`)
- Header is set immediately on session restore and on login
- Header is removed on sign-out
- Backend uses this to scope all data queries to the authenticated user

### Session Security

- **30-day expiry** — sessions automatically clear after 30 days
- **Server-side verification** on every app launch
- **Account deletion handling** — 404 from `/api/auth/me` clears local session
- **Silent fail** — network errors don't log out the user (offline friendliness)
- Session JSON stored in `AsyncStorage` (sandboxed to the app by iOS)

### Input Validation

| Field | Validation |
|---|---|
| Email | Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| Password | Minimum 8 characters |
| Phone | Auto-prefixes `+91` if no country code |
| Passcode | 4-digit PIN confirmed twice |
| Hex color | `/^#[0-9A-Fa-f]{6}$/` before applying to theme |

### No Sensitive Data in Logs

- Passwords are never logged
- OTP codes are handled transiently and not stored locally
- Session storage only contains non-sensitive profile fields (no password stored)

---

## 12. Privacy & Data Handling

### What Data is Collected

| Data | Purpose | Stored |
|---|---|---|
| Name | User identity, greeting | Server + AsyncStorage |
| Email | Auth (OTP + password login) | Server + AsyncStorage |
| Phone | Auth (phone OTP login) | Server + AsyncStorage |
| Password | Hashed on server for password login | Server only (hashed) |
| Event data | Core app functionality | Server |
| Team contacts | Core app functionality | Server |
| Travel records | Core app functionality | Server |
| Settings | User preferences | Server |
| Feedback | App improvement | Server |

### Data Isolation

- All data is scoped to the authenticated user via `X-User-Id` header
- No cross-user data access at the API level

### Data Deletion

- User can trigger **"Clear All Data"** from Settings → `DELETE /api/data/clear`
- Removes all events, travel, team data, settings for that user from the backend

### Offline Behavior

- If the server is unreachable on launch, the last valid session is used (no forced logout)
- Data mutations (create/edit/delete) require a live connection — no offline queue

### AsyncStorage

- iOS sandboxes `AsyncStorage` to the app — other apps cannot read it
- Stores session JSON only — no financial data, no event records stored locally
- Cleared on sign-out or session expiry

### Maps Integration

- Address fields are composed into a Google Maps URL (`maps.google.com/?q=...`)
- No location tracking — user manually enters address
- Maps can be disabled in Settings (`mapsEnabled: false`)

---

## 13. Backend Overview

### Base URL

```
https://mua-planner1.onrender.com
```

Hosted on **Render** free tier. The same backend is shared between:
- This React Native mobile app
- The macOS SwiftUI app (`crissteve018/mua-planner-mac`)

### Timeout

All API requests have a **10-second timeout** configured in the Axios instance. If the Render server is cold-starting (free tier spins down after inactivity), the first request may take up to 30–60 seconds — the app will show a loading state until the response comes back.

### API Response Format

Consistent envelope format across all endpoints:

```json
{
  "success": true,
  "data": { ... }
}
```

On error:
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### Request Headers

```
Content-Type: application/json
X-User-Id: <user_id>
```

---

*Last updated: June 2026*
