# MUA Planner — Copilot Workspace Instructions

## Project Identity
- **App:** MUA Planner — a professional event booking app for Makeup Artists
- **Platform:** React Native + Expo (iOS-first)
- **Workspace:** `/Users/steve-6162/Desktop/muaplanner_app`
- **GitHub Repo:** `crissteve018/mua-planner`
- **Backend:** `https://mua-planner1.onrender.com` (Render free tier, shared with macOS app)
- **Related project:** macOS SwiftUI app at `crissteve018/mua-planner-mac`
- **Owner:** Steve (GitHub: crissteve018)
- **Apple Developer Account:** Active — app is distributed via **TestFlight**
- **Bundle ID:** `SteveLearn.org.MUAPlanner`
- **Xcode Workspace:** `ios/MUAPlanner.xcworkspace`

## Read This First
Before starting any work, read the full technical guide:
📄 `MUA_PLANNER_GUIDE.md` — located at the project root.
It covers: architecture, navigation, auth flow, all API endpoints, screen details, theming, security, and privacy.

## Tech Stack (Quick Reference)
- React Native 0.83.2, Expo ~55.0.4, React 19.2.0
- React Navigation v7 (Native Stack + Bottom Tabs)
- Axios for HTTP, AsyncStorage for session
- Context API only (no Redux/Zustand)
- `useTheme()` hook for all colors — never hardcode colors from COLORS directly in screens
- `X-User-Id` header scopes all API requests to the logged-in user

## Project Structure (Quick Reference)
```
src/
  api/          → All HTTP calls (auth, events, travel, team, settings, dashboard)
  components/   → AutocompleteInput, SplashScreen, UndoSnackbar
  constants/    → Event types, colors, locations, muhurthamDates
  context/      → AuthContext, SettingsContext
  screens/      → One file per screen
App.js          → Root: providers, navigation, auth gate
MUA_PLANNER_GUIDE.md → Full technical documentation (always keep updated)
```

## Mandatory Workflow — After Every Change

When any change is made to the app, follow these steps **in order**:

### 1. Update the Guide (`MUA_PLANNER_GUIDE.md`)
- If a new screen is added → add it to the navigation tree and Screens section
- If an API endpoint is added/changed → update the API Endpoints Reference tables
- If a new constant/config is added → update Constants section
- If auth flow changes → update the Authentication System section
- If settings change → update the Settings section
- If security or privacy behavior changes → update sections 11 and 12
- Always update the `Last updated` date at the bottom of the guide

### 2. Update Privacy Policy (`src/screens/PrivacyPolicyScreen.js`) — if required
Update the Privacy Policy screen if any of these change:
- What user data is collected (new fields on sign up, profile, etc.)
- How data is stored or processed
- New third-party integrations or SDKs added
- Changes to data deletion behavior
- New permissions requested (camera, contacts, location, etc.)
- Changes to session duration or expiry logic

### 3. Commit & Push to Git
Always use this pattern:
```
git add .
git commit -m "<type>: <short description>"
git push
```

Commit type prefixes:
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — guide or documentation update only
- `style:` — UI/styling changes
- `refactor:` — code restructure, no behavior change
- `chore:` — config, dependencies, tooling

### 4. Prepare Xcode for TestFlight Build (when releasing)
Steve has an active **Apple Developer account** and distributes the app via **TestFlight**. Before archiving, ensure:
- `app.json` version/buildNumber is bumped if releasing a new build
- Run `npx expo prebuild --platform ios` if any native config changed (new permissions, new native modules, etc.)
- Open `ios/MUAPlanner.xcworkspace` in Xcode (never open `.xcodeproj` directly)
- Set scheme to **MUAPlanner** and destination to **Any iOS Device (arm64)**
- Go to **Product → Archive** to create the archive
- Upload via **Distribute App → App Store Connect → TestFlight**

**Remind Steve to Archive whenever:**
- A new feature or fix is ready for testing
- A new native permission was added (must rebuild native layer)
- `app.json` or `Info.plist` was changed
- Any Expo SDK or react-native upgrade was done

## Coding Conventions
- All screens consume theme via `const C = useTheme();`
- API calls always go in `src/api/` — never inline fetch/axios in screens
- All API files import the shared axios instance: `import api from './events'`
- Validate user input at the screen level before calling API
- Use `useFocusEffect` for data that should refresh when navigating back to a screen
- No hardcoded user IDs — always comes from `useAuth().user`
- Phone numbers: auto-prefix `+91` if no country code provided
- Currency: display as `₹` using `toLocaleString('en-IN')`
- Dates: use `en-IN` locale for display

## Security Rules (Never Break These)
- All API calls must go through the shared Axios instance in `src/api/events.js`
- Never bypass the HTTPS interceptor
- Never log passwords, OTPs, or tokens
- Always call `setApiUserId(null)` on sign-out
- Validate hex color strings before applying to theme: `/^#[0-9A-Fa-f]{6}$/`

## Key Files to Know
| File | Purpose |
|---|---|
| `App.js` | Navigation structure, auth gate, provider nesting |
| `src/api/events.js` | Shared Axios instance + Events API + `setApiUserId` |
| `src/api/config.js` | Backend base URL |
| `src/context/AuthContext.js` | Session management, signIn/signOut/updateUser |
| `src/context/SettingsContext.js` | Theme, dark mode, user preferences |
| `src/constants/index.js` | Event types, status config, colors, extra services |
| `src/constants/muhurthamDates.js` | Hindu auspicious marriage dates for calendar |
| `MUA_PLANNER_GUIDE.md` | Full technical documentation |

## When in Doubt
- Check `MUA_PLANNER_GUIDE.md` for the authoritative reference
- Never delete or restructure existing API files without checking all screens that import them
- The backend is shared with macOS — coordinate API changes carefully
