const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const newEvents = [
  {
    clientName: 'Ramya Suresh',
    clientPhone: '9876012345',
    eventType: 'Engagement',
    eventDate: '2026-03-06',
    eventTime: '16:00',
    country: 'India',
    state: 'Telangana',
    city: 'Hyderabad',
    packageAmount: 18000,
    advancePaid: 5000,
    status: 'completed',
  },
  {
    clientName: 'Ananya Iyer',
    clientPhone: '9845012345',
    eventType: 'Mehandi',
    eventDate: '2026-03-25',
    eventTime: '10:00',
    country: 'India',
    state: 'Karnataka',
    city: 'Bangalore',
    packageAmount: 22000,
    advancePaid: 7000,
    status: 'upcoming',
  },
  {
    clientName: 'Nithya Ganesh',
    clientPhone: '9900112233',
    eventType: 'Baby Shower',
    eventDate: '2026-03-25',
    eventTime: '17:00',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    packageAmount: 15000,
    advancePaid: 5000,
    status: 'upcoming',
  },
  {
    clientName: 'Swathi Pillai',
    clientPhone: '9847098765',
    eventType: 'Half Saree Event',
    eventDate: '2026-04-10',
    eventTime: '09:30',
    country: 'India',
    state: 'Kerala',
    city: 'Kochi',
    packageAmount: 12000,
    advancePaid: 4000,
    status: 'upcoming',
  },
  {
    clientName: 'Kavitha Reddy',
    clientPhone: '9876543211',
    eventType: 'Haldi',
    eventDate: '2026-04-15',
    eventTime: '08:00',
    country: 'India',
    state: 'Tamil Nadu',
    city: 'Chennai',
    packageAmount: 20000,
    advancePaid: 8000,
    status: 'upcoming',
  },
  {
    clientName: 'Pooja Menon',
    clientPhone: '9847011223',
    eventType: 'Muhurtham',
    eventDate: '2026-04-20',
    eventTime: '07:30',
    country: 'India',
    state: 'Kerala',
    city: 'Trivandrum',
    packageAmount: 35000,
    advancePaid: 15000,
    status: 'upcoming',
  },
  {
    clientName: 'Suhana Ahmed',
    clientPhone: '9123456780',
    eventType: 'Cocktail',
    eventDate: '2026-05-01',
    eventTime: '19:00',
    country: 'India',
    state: 'Andhra Pradesh',
    city: 'Visakhapatnam',
    packageAmount: 18000,
    advancePaid: 6000,
    status: 'upcoming',
  },
];

const stmt = db.prepare(`
  INSERT INTO events (id, clientName, clientPhone, eventType, eventDate, eventTime,
    country, state, city, packageAmount, advancePaid, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

newEvents.forEach(e => {
  stmt.run(uuidv4(), e.clientName, e.clientPhone, e.eventType, e.eventDate, e.eventTime,
    e.country, e.state, e.city, e.packageAmount, e.advancePaid, e.status);
});

console.log('Inserted', newEvents.length, 'new events');

// Verify clusters
const clusters = db.prepare(`
  SELECT eventDate, COUNT(*) as cnt, GROUP_CONCAT(clientName, ', ') as names
  FROM events
  GROUP BY eventDate
  HAVING cnt > 1
  ORDER BY eventDate
`).all();
console.log('\nMulti-event days:');
clusters.forEach(c => console.log(`  ${c.eventDate} → ${c.cnt} events: ${c.names}`));

const total = db.prepare('SELECT COUNT(*) as cnt FROM events').get();
console.log('\nTotal events:', total.cnt);
