// ─────────────────────────────────────────────
// Countries & States data for autocomplete
// ─────────────────────────────────────────────

export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium',
  'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Brunei',
  'Bulgaria', 'Cambodia', 'Cameroon', 'Canada', 'Chile', 'China',
  'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
  'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Georgia', 'Germany',
  'Ghana', 'Greece', 'Guatemala', 'Hong Kong', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Libya', 'Lithuania',
  'Luxembourg', 'Macau', 'Malaysia', 'Maldives', 'Malta', 'Mauritius',
  'Mexico', 'Moldova', 'Mongolia', 'Montenegro', 'Morocco', 'Myanmar',
  'Namibia', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia',
  'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan',
  'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
  'Thailand', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe',
];

export const STATES_BY_COUNTRY = {
  'India': [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal',
    // Union Territories
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  'United Kingdom': [
    'England', 'Scotland', 'Wales', 'Northern Ireland',
  ],
  'United Arab Emirates': [
    'Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah',
    'Sharjah', 'Umm Al Quwain',
  ],
  'Canada': [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
    'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
    'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan',
    'Yukon',
  ],
  'Australia': [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory',
    'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia',
  ],
  'Saudi Arabia': [
    'Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk',
    'Ha\'il', 'Northern Borders', 'Jazan', 'Najran', 'Al Bahah',
    'Al Jawf', 'Qassim',
  ],
  'Sri Lanka': [
    'Central', 'Eastern', 'North Central', 'North Western', 'Northern',
    'Sabaragamuwa', 'Southern', 'Uva', 'Western',
  ],
  'Malaysia': [
    'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
    'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya',
    'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
  ],
  'Singapore': ['Singapore'],
  'Qatar': [
    'Ad Dawhah', 'Al Khawr', 'Al Rayyan', 'Al Wakrah',
    'Ash Shamal', 'Az Za\'ayin', 'Umm Salal',
  ],
  'Kuwait': [
    'Al Ahmadi', 'Al Farwaniyah', 'Al Jahra', 'Capital',
    'Hawalli', 'Mubarak Al-Kabeer',
  ],
  'Bahrain': [
    'Capital', 'Muharraq', 'Northern', 'Southern',
  ],
  'Oman': [
    'Ad Dakhiliyah', 'Ad Dhahirah', 'Al Batinah North', 'Al Batinah South',
    'Al Buraymi', 'Al Wusta', 'Ash Sharqiyah North', 'Ash Sharqiyah South',
    'Dhofar', 'Musandam', 'Muscat',
  ],
};

/**
 * Generate a Google Maps direction/search URL from location parts
 */
export function generateMapsUrl(parts = {}) {
  const pieces = [
    parts.building,
    parts.city,
    parts.state,
    parts.country,
  ].filter(Boolean);

  if (pieces.length === 0) return '';

  const query = encodeURIComponent(pieces.join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// ─────────────────────────────────────────────
// Cities data for travel autocomplete
// ─────────────────────────────────────────────

export const CITIES_BY_COUNTRY = {
  'India': [
    'Agartala', 'Agra', 'Ahmedabad', 'Aizawl', 'Ajmer', 'Allahabad (Prayagraj)',
    'Amritsar', 'Aurangabad', 'Bangalore (Bengaluru)', 'Bareilly', 'Bhopal', 'Bhubaneswar',
    'Chandigarh', 'Chennai', 'Coimbatore', 'Cuttack', 'Dehradun', 'Delhi',
    'Dharamshala', 'Dibrugarh', 'Durgapur', 'Ernakulam (Kochi)', 'Faridabad',
    'Gandhinagar', 'Gangtok', 'Gaya', 'Ghaziabad', 'Goa (Panaji)', 'Gorakhpur',
    'Greater Noida', 'Gurgaon (Gurugram)', 'Guwahati', 'Gwalior', 'Howrah',
    'Hubli', 'Hyderabad', 'Imphal', 'Indore', 'Itanagar', 'Jabalpur',
    'Jaipur', 'Jalandhar', 'Jammu', 'Jamshedpur', 'Jodhpur', 'Kanpur',
    'Kochi', 'Kohima', 'Kolhapur', 'Kolkata', 'Kota', 'Kozhikode (Calicut)',
    'Lucknow', 'Ludhiana', 'Madurai', 'Mangalore', 'Meerut', 'Mumbai',
    'Mysore (Mysuru)', 'Nagpur', 'Nashik', 'Navi Mumbai', 'New Delhi',
    'Noida', 'Panaji', 'Patna', 'Pondicherry (Puducherry)', 'Pune',
    'Raipur', 'Rajkot', 'Ranchi', 'Salem', 'Shillong', 'Shimla',
    'Siliguri', 'Srinagar', 'Surat', 'Thane', 'Thiruvananthapuram',
    'Tiruchirappalli (Trichy)', 'Tirupati', 'Udaipur', 'Ujjain', 'Vadodara',
    'Varanasi', 'Vijayawada', 'Visakhapatnam', 'Warangal',
  ],
  'United Arab Emirates': [
    'Abu Dhabi', 'Ajman', 'Al Ain', 'Dubai', 'Fujairah',
    'Ras Al Khaimah', 'Sharjah',
  ],
  'United States': [
    'Atlanta', 'Austin', 'Boston', 'Chicago', 'Dallas', 'Denver',
    'Houston', 'Las Vegas', 'Los Angeles', 'Miami', 'New York',
    'Orlando', 'Philadelphia', 'Phoenix', 'San Diego', 'San Francisco',
    'Seattle', 'Washington D.C.',
  ],
  'United Kingdom': [
    'Belfast', 'Birmingham', 'Bristol', 'Edinburgh', 'Glasgow',
    'Leeds', 'Liverpool', 'London', 'Manchester', 'Newcastle',
  ],
  'Canada': [
    'Calgary', 'Edmonton', 'Halifax', 'Montreal', 'Ottawa',
    'Toronto', 'Vancouver', 'Winnipeg',
  ],
  'Australia': [
    'Adelaide', 'Brisbane', 'Canberra', 'Melbourne', 'Perth', 'Sydney',
  ],
  'Saudi Arabia': [
    'Dammam', 'Jeddah', 'Mecca', 'Medina', 'Riyadh',
  ],
  'Singapore': ['Singapore'],
  'Malaysia': [
    'George Town (Penang)', 'Johor Bahru', 'Kuala Lumpur', 'Malacca',
  ],
  'Sri Lanka': [
    'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo',
  ],
  'Qatar': ['Doha'],
  'Kuwait': ['Kuwait City'],
  'Bahrain': ['Manama'],
  'Oman': ['Muscat', 'Salalah'],
};
