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

// ─────────────────────────────────────────────
// Railway stations data for train autocomplete
// ─────────────────────────────────────────────

export const STATIONS_BY_CITY = {
  // Tamil Nadu
  'Chennai': ['Chennai Central (MAS)', 'Chennai Egmore (MS)', 'Tambaram (TBM)', 'Perambur (PER)', 'Mambalam (MBM)', 'Guindy (GY)', 'Chromepet (CMP)', 'Avadi (AVD)', 'Tiruvallur (TRL)', 'Perungalathur (PGLT)'],
  'Coimbatore': ['Coimbatore Junction (CBE)', 'Coimbatore North (CBF)', 'Podanur (PTJ)'],
  'Madurai': ['Madurai Junction (MDU)'],
  'Salem': ['Salem Junction (SA)'],
  'Tiruchirappalli (Trichy)': ['Tiruchirappalli Junction (TPJ)', 'Srirangam (SRR)'],
  'Tirupati': ['Tirupati (TPTY)', 'Tirumala (TMLP)'],
  'Ernakulam (Kochi)': ['Ernakulam Junction (ERS)', 'Ernakulam Town (ERN)'],
  'Kochi': ['Ernakulam Junction (ERS)', 'Ernakulam Town (ERN)'],

  // Karnataka
  'Bangalore (Bengaluru)': ['KSR Bengaluru (SBC)', 'Yesvantpur Junction (YPR)', 'Bengaluru Cantonment (BNC)', 'Whitefield (WFD)', 'Krishnarajapuram (KJM)', 'Banaswadi (BAND)'],
  'Mysore (Mysuru)': ['Mysuru Junction (MYS)'],
  'Hubli': ['Hubballi Junction (UBL)'],
  'Mangalore': ['Mangaluru Central (MAQ)', 'Mangaluru Junction (MAJN)'],

  // Andhra Pradesh / Telangana
  'Hyderabad': ['Secunderabad Junction (SC)', 'Hyderabad Deccan (HYB)', 'Kacheguda (KCG)', 'Lingampally (LPI)', 'Begumpet (BMT)'],
  'Vijayawada': ['Vijayawada Junction (BZA)'],
  'Visakhapatnam': ['Visakhapatnam (VSKP)'],
  'Warangal': ['Warangal (WL)'],

  // Kerala
  'Thiruvananthapuram': ['Thiruvananthapuram Central (TVC)'],
  'Kozhikode (Calicut)': ['Kozhikode (CLT)'],

  // Maharashtra
  'Mumbai': ['Chhatrapati Shivaji Terminus (CSMT)', 'Mumbai Central (MMCT)', 'Dadar (DR)', 'Lokmanya Tilak Terminus (LTT)', 'Bandra Terminus (BDTS)', 'Andheri (ADH)', 'Borivali (BVI)', 'Thane (TNA)', 'Panvel (PNVL)', 'Kalyan Junction (KYN)'],
  'Pune': ['Pune Junction (PUNE)', 'Shivajinagar (SVJ)', 'Khadki (KK)', 'Hadapsar (HDP)'],
  'Nagpur': ['Nagpur Junction (NGP)'],
  'Nashik': ['Nashik Road (NK)'],
  'Navi Mumbai': ['Panvel (PNVL)', 'Vashi (VASI)'],
  'Thane': ['Thane (TNA)', 'Kalyan Junction (KYN)'],
  'Kolhapur': ['Kolhapur (KOP)'],
  'Aurangabad': ['Aurangabad (AWB)'],

  // Delhi / NCR
  'Delhi': ['New Delhi (NDLS)', 'Old Delhi (DLI)', 'Hazrat Nizamuddin (NZM)', 'Anand Vihar Terminal (ANVT)', 'Delhi Sarai Rohilla (DEE)', 'Delhi Cantt (DEC)'],
  'New Delhi': ['New Delhi (NDLS)', 'Old Delhi (DLI)', 'Hazrat Nizamuddin (NZM)', 'Anand Vihar Terminal (ANVT)', 'Delhi Sarai Rohilla (DEE)'],
  'Gurgaon (Gurugram)': ['Gurugram (GGN)'],
  'Ghaziabad': ['Ghaziabad (GZB)'],
  'Noida': ['Dadri (DDNR)', 'Ghaziabad (GZB)'],
  'Greater Noida': ['Dadri (DDNR)'],
  'Faridabad': ['Faridabad (FDB)'],

  // West Bengal
  'Kolkata': ['Howrah Junction (HWH)', 'Sealdah (SDAH)', 'Kolkata (KOAA)', 'Santragachi Junction (SRC)', 'Shalimar (SHM)', 'Dumdum (DDJ)', 'Ballygunge Junction (BLN)'],
  'Howrah': ['Howrah Junction (HWH)', 'Santragachi Junction (SRC)'],
  'Siliguri': ['New Jalpaiguri (NJP)', 'Siliguri Junction (SGUJ)'],
  'Durgapur': ['Durgapur (DGR)'],

  // Uttar Pradesh
  'Lucknow': ['Lucknow (LKO)', 'Lucknow Junction (LJN)', 'Lucknow Charbagh (LKO)'],
  'Kanpur': ['Kanpur Central (CNB)'],
  'Varanasi': ['Varanasi Junction (BSB)', 'Varanasi City (BCY)', 'Manduadih (MUV)'],
  'Agra': ['Agra Cantt (AGC)', 'Agra Fort (AF)', 'Raja Ki Mandi (RKM)'],
  'Allahabad (Prayagraj)': ['Prayagraj Junction (PYGS)', 'Prayagraj Rambagh (PYRG)'],
  'Gorakhpur': ['Gorakhpur Junction (GKP)'],
  'Meerut': ['Meerut City (MTC)'],
  'Bareilly': ['Bareilly Junction (BE)'],
  'Gaya': ['Gaya Junction (GAYA)'],

  // Rajasthan
  'Jaipur': ['Jaipur Junction (JP)', 'Durgapura (DPA)', 'Gandhinagar Jaipur (GADJ)'],
  'Jodhpur': ['Jodhpur Junction (JU)'],
  'Udaipur': ['Udaipur City (UDZ)'],
  'Ajmer': ['Ajmer Junction (AII)'],
  'Kota': ['Kota Junction (KOTA)'],

  // Gujarat
  'Ahmedabad': ['Ahmedabad Junction (ADI)', 'Sabarmati (SBI)', 'Maninagar (MAN)'],
  'Surat': ['Surat (ST)', 'Udhna Junction (UDN)'],
  'Vadodara': ['Vadodara Junction (BRC)'],
  'Rajkot': ['Rajkot Junction (RJT)'],
  'Gandhinagar': ['Gandhinagar Capital (GNC)'],

  // Madhya Pradesh
  'Bhopal': ['Bhopal Junction (BPL)', 'Habibganj (HBJ)'],
  'Indore': ['Indore Junction (INDB)'],
  'Jabalpur': ['Jabalpur (JBP)'],
  'Gwalior': ['Gwalior Junction (GWL)'],
  'Ujjain': ['Ujjain Junction (UJN)'],

  // Bihar / Jharkhand
  'Patna': ['Patna Junction (PNBE)', 'Rajendra Nagar Terminal (RJPB)', 'Danapur (DNR)'],
  'Ranchi': ['Ranchi (RNC)', 'Hatia (HTE)'],
  'Jamshedpur': ['Tatanagar Junction (TATA)'],

  // Odisha / Chhattisgarh
  'Bhubaneswar': ['Bhubaneswar (BBS)'],
  'Cuttack': ['Cuttack Junction (CTC)'],
  'Raipur': ['Raipur Junction (R)'],

  // Punjab / Haryana / Chandigarh
  'Chandigarh': ['Chandigarh (CDG)'],
  'Amritsar': ['Amritsar Junction (ASR)'],
  'Ludhiana': ['Ludhiana Junction (LDH)'],
  'Jalandhar': ['Jalandhar City (JUC)', 'Jalandhar Cantt (JRC)'],

  // Northeast
  'Guwahati': ['Guwahati (GHY)', 'Kamakhya (KYQ)'],
  'Dibrugarh': ['Dibrugarh (DBRG)', 'Dibrugarh Town (DBRT)'],
  'Agartala': ['Agartala (AGTL)'],
  'Imphal': ['Jiribam (JRB)'],

  // Himachal / Uttarakhand / J&K
  'Shimla': ['Shimla (SML)', 'Kalka (KLK)'],
  'Dehradun': ['Dehradun (DDN)', 'Haridwar Junction (HW)'],
  'Jammu': ['Jammu Tawi (JAT)'],
  'Srinagar': ['Srinagar (SINA)'],
  'Dharamshala': ['Pathankot (PTK)'],

  // Goa
  'Goa (Panaji)': ['Madgaon Junction (MAO)', 'Thivim (THVM)', 'Vasco Da Gama (VSG)', 'Karmali (KRMI)'],
  'Panaji': ['Karmali (KRMI)', 'Thivim (THVM)'],

  // Pondicherry
  'Pondicherry (Puducherry)': ['Puducherry (PDY)'],
};
