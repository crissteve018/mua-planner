const db = require('./database');
const { v4: uuidv4 } = require('uuid');
const now = new Date().toISOString();

// Check if we already have travel records
const existing = db.prepare('SELECT COUNT(*) as cnt FROM travel').get();
if (existing.cnt > 0) {
  console.log('Travel records already exist:', existing.cnt);
  process.exit(0);
}

const events = db.prepare('SELECT id, clientName FROM events LIMIT 6').all();
if (events.length === 0) {
  console.log('No events found to link travel to.');
  process.exit(1);
}

console.log('Found', events.length, 'events to link travel to');

const seed = [
  // Event 1: Flight + Cab (multi-leg)
  {
    eventId: events[0].id, legOrder: 1, travelMode: 'flight',
    travelStatus: 'booked', bookingStatus: 'ticket_received',
    travelDate: '2025-08-15', returnDate: '2025-08-17',
    totalCost: 8500, numTravellers: 2,
    departureCity: 'Mumbai', arrivalCity: 'Hyderabad', airlineName: 'IndiGo',
    notes: 'Morning flight, 6:30 AM departure'
  },
  {
    eventId: events[0].id, legOrder: 2, travelMode: 'cab',
    travelStatus: 'planned', bookingStatus: 'not_booked',
    travelDate: '2025-08-15', returnDate: '', totalCost: 800,
    cabProvider: 'Ola', pickupLocation: 'Hyderabad Airport', dropLocation: 'Banjara Hills Venue',
    estimatedFare: 800, notes: 'Book day before'
  },
  // Event 2: Train
  {
    eventId: events[1].id, legOrder: 1, travelMode: 'train',
    travelStatus: 'booked', bookingStatus: 'booked',
    travelDate: '2025-09-10', returnDate: '2025-09-12',
    totalCost: 2400, numTravellers: 1,
    trainNumber: '12604', trainName: 'Chennai Express',
    departureStation: 'Mumbai CST', arrivalStation: 'Chennai Central',
    notes: 'SL class, berth 42'
  },
  // Event 3: Own Car
  {
    eventId: events[2].id, legOrder: 1, travelMode: 'own_car',
    travelStatus: 'completed', bookingStatus: 'not_booked',
    travelDate: '2025-07-20', returnDate: '', totalCost: 1650,
    startingLocation: 'Andheri, Mumbai', destination: 'Pune',
    distance: 150, fuelCost: 1200, tollCharges: 350, parkingCharges: 100,
  },
  // Event 4: Bus
  {
    eventId: events[3].id, legOrder: 1, travelMode: 'bus',
    travelStatus: 'planned', bookingStatus: 'booked',
    travelDate: '2025-10-05', returnDate: '', totalCost: 1200, numTravellers: 1,
    busOperator: 'KSRTC Airavat', departureLocation: 'Bangalore', arrivalLocation: 'Mysore',
    notes: 'Evening 6 PM departure'
  },
  // Event 5: Flight
  {
    eventId: events[4].id, legOrder: 1, travelMode: 'flight',
    travelStatus: 'planned', bookingStatus: 'not_booked',
    travelDate: '2025-11-22', returnDate: '',
    totalCost: 6200, numTravellers: 1,
    departureCity: 'Delhi', arrivalCity: 'Jaipur', airlineName: 'Air India',
    notes: 'Check prices closer to date'
  },
];

const insert = db.prepare(`
  INSERT INTO travel (id, eventId, legOrder, travelMode, travelStatus, bookingStatus,
    travelDate, returnDate, totalCost, notes, numTravellers,
    departureCity, arrivalCity, airlineName,
    trainNumber, trainName, departureStation, arrivalStation,
    cabProvider, pickupLocation, dropLocation, estimatedFare, driverContact,
    startingLocation, destination, distance, fuelCost, tollCharges, parkingCharges,
    busOperator, departureLocation, arrivalLocation,
    createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const s of seed) {
  insert.run(
    uuidv4(), s.eventId, s.legOrder || 1, s.travelMode,
    s.travelStatus || 'planned', s.bookingStatus || 'not_booked',
    s.travelDate || '', s.returnDate || '', s.totalCost || 0, s.notes || '',
    s.numTravellers || 1,
    s.departureCity || '', s.arrivalCity || '', s.airlineName || '',
    s.trainNumber || '', s.trainName || '', s.departureStation || '', s.arrivalStation || '',
    s.cabProvider || '', s.pickupLocation || '', s.dropLocation || '', s.estimatedFare || 0, s.driverContact || '',
    s.startingLocation || '', s.destination || '', s.distance || 0, s.fuelCost || 0, s.tollCharges || 0, s.parkingCharges || 0,
    s.busOperator || '', s.departureLocation || '', s.arrivalLocation || '',
    now, now
  );
}

const count = db.prepare('SELECT COUNT(*) as cnt FROM travel').get();
console.log('✅ Seeded', seed.length, 'travel records. Total:', count.cnt);

// Verify
const recs = db.prepare('SELECT travelMode, travelStatus, totalCost, departureCity, arrivalCity FROM travel').all();
recs.forEach(r => {
  console.log(`  ${r.travelMode} | ${r.travelStatus} | ₹${r.totalCost} | ${r.departureCity || '-'} → ${r.arrivalCity || '-'}`);
});
