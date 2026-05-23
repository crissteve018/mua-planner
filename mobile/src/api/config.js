// ──────────────────────────────────────────────
// API Configuration
// ──────────────────────────────────────────────
// Cloud backend hosted on Render (free tier)
// For local dev, switch to: http://localhost:3000
// For physical device, use Render URL: https://mua-planner1.onrender.com

const API_BASE_URL = 'https://mua-planner1.onrender.com';

// Security check: Warn if non-HTTPS URL is used in production
if (!__DEV__ && API_BASE_URL && !API_BASE_URL.startsWith('https://')) {
  console.warn(
    '⚠️ SECURITY WARNING: API_BASE_URL is not using HTTPS!',
    'This is insecure for production. Please use https://'
  );
}

// Dev mode warning (less severe)
if (__DEV__ && API_BASE_URL && !API_BASE_URL.startsWith('https://')) {
  console.log('📡 Dev mode: Using non-HTTPS URL for API:', API_BASE_URL);
}

export default API_BASE_URL;
