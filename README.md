# MUA Planner

A professional makeup artist scheduling and client management app.

- **Mobile**: React Native + Expo (iOS)
- **Backend**: Node.js + Express, hosted on Render (`mua-planner1.onrender.com`)
- **Database**: PostgreSQL (Neon)
- **Bundle ID**: `com.muaplanner.app`  |  **Version**: `1.0.0`

---

## Project Structure

```
narus-makeapp/
├── mobile/          # React Native / Expo app
├── backend/         # Express API server
└── docs/            # Privacy policy + assets
```

---

## Running Locally

### Backend
```bash
cd backend
npm install
node server.js
```

### Mobile (iOS Simulator)
```bash
cd mobile
npx expo start --ios
```

> Make sure the backend `BASE_URL` in `mobile/src/api/` points to the correct server.

---

## Authentication Flow

### Sign Up
1. User fills **Name**, **Email**, **Phone** (mandatory), **Password** on `SignUpScreen`
2. Backend sends **Email OTP** (Brevo SMTP) + **SMS OTP** (Twilio Verify)
3. `DualOTPScreen` — user enters both 6-digit OTPs
4. On success: account created, password hashed with `bcrypt` (12 rounds), user redirected to Login

### Login — 3 modes (tab toggle on `LoginScreen`)
| Mode | Flow |
|------|------|
| **Password** | Email + password → direct login via `POST /api/auth/login/password` |
| **Email OTP** | Email → OTP sent → `OTPVerificationScreen` |
| **Phone OTP** | Phone → SMS OTP → `OTPVerificationScreen` |

### API Endpoints (auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Sends email + phone OTPs, returns masked contact info |
| POST | `/api/auth/register/verify` | Verifies both OTPs, creates account |
| POST | `/api/auth/login/password` | Email + password login |
| POST | `/api/auth/login` | Email OTP — sends OTP |
| POST | `/api/auth/verify` | Email OTP — verifies |
| POST | `/api/auth/phone/send` | Phone OTP — sends (only for registered phones) |
| POST | `/api/auth/phone/verify` | Phone OTP — verifies |

---

## UI Theme (Auth Screens)

All auth screens (`SignUpScreen`, `LoginScreen`, `OTPVerificationScreen`, `DualOTPScreen`) use a **dark + gold luxury** theme matching the app logo:

| Token | Value | Usage |
|-------|-------|-------|
| `BG` | `#0F0F0F` | Screen background |
| `CARD` | `#1C1C1C` | Card / form surface |
| `GOLD` | `#C9A84C` | Titles, accents, buttons, active states |
| `TEXT` | `#F5F0E8` | Body text, input values |
| `TEXT_SEC` | `#A09070` | Labels, subtitles |
| `INPUT_BG` | `#272727` | Input field background |
| `BORDER` | `#383830` | Input borders |

---

## Bug Fixes Applied

- **"Could not save event"** — `sanitizeEmail` now uses `checkFalsy: true` so optional empty email passes validation
- **Past dates blocked** — removed `minimumDate` from `DateTimePicker` in `AddEventScreen`
- **Keyboard hiding fields** — replaced `KeyboardAvoidingView` with `automaticallyAdjustKeyboardInsets` on `ScrollView`
- **Phone OTP phantom accounts** — `/api/auth/phone/send` now checks if phone is registered before sending OTP

---

## Backend Dependencies

```
express, pg, bcrypt, nodemailer, twilio, express-validator, cors, dotenv
```

`bcrypt` added for password hashing (`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`).

---

## Deployment

- **Backend**: Auto-deploys to Render on push to `main` (GitHub → Render integration)
- **Mobile**: Archive in Xcode → Upload to App Store Connect → TestFlight

### iOS Build Steps
1. `cd mobile && npx expo prebuild --platform ios` (if needed)
2. Open `mobile/ios/MUAPlanner.xcworkspace` in Xcode
3. Set scheme to **MUAPlanner** → Any iOS Device (arm64)
4. **Product → Archive**
5. Distribute App → App Store Connect → Upload

---

## App Store

- **Privacy Policy**: `docs/privacy-policy.html` (hosted via GitHub Pages)
- **Screenshots**: `Appstore Screenshots/resized/` (1284×2778 for 6.5" display)
- **Contact**: crissteve018@icloud.com
