const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const newEvents = [
  // ────────────────────────────────────────────
  // MIXED STATUS: upcoming + cancelled on same day
  // ────────────────────────────────────────────

  // Mar 20 already has Lakshmi Iyer (Haldi, cancelled)
  // → Add an upcoming event to make it mixed
  {
    clientName: 'Deepa Nambiar',
    clientPhone: '9900223344',
    eventType: 'Sangeeth',
    eventDate: '2026-03-20',
    eventTime: '18:00',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    packageAmount: 25000,
    advancePaid: 10000,
    status: 'upcoming',
  },

  // Apr 10 has 2 upcoming events (Meera + Swathi)
  // → Add a cancelled event to make it mixed
  {
    clientName: 'Gayathri Bhat',
    clientPhone: '9845511223',
    eventType: 'Reception',
    eventDate: '2026-04-10',
    eventTime: '11:00',
    country: 'India',
    state: 'Kerala',
    city: 'Kochi',
    packageAmount: 20000,
    advancePaid: 8000,
    status: 'cancelled',
  },

  // ────────────────────────────────────────────
  // MUHURTHAM DATES WITH EVENTS (show names on lamp days)
  // ────────────────────────────────────────────

  // Mar 4, 2026 is a muhurtham date
  {
    clientName: 'Ranjini Menon',
    clientPhone: '9847055667',
    eventType: 'Muhurtham',
    eventDate: '2026-03-04',
    eventTime: '07:00',
    country: 'India',
    state: 'Tamil Nadu',
    city: 'Madurai',
    packageAmount: 30000,
    advancePaid: 12000,
    status: 'upcoming',
  },

  // Mar 5, 2026 is a muhurtham date
  {
    clientName: 'Vasundhara Ravi',
    clientPhone: '9900334455',
    eventType: 'Muhurtham',
    eventDate: '2026-03-05',
    eventTime: '06:30',
    country: 'India',
    state: 'Karnataka',
    city: 'Mysore',
    packageAmount: 28000,
    advancePaid: 10000,
    status: 'upcoming',
  },

  // Apr 14, 2026 is a muhurtham date
  {
    clientName: 'Harini Prasad',
    clientPhone: '9876044556',
    eventType: 'Muhurtham',
    eventDate: '2026-04-14',
    eventTime: '08:00',
    country: 'India',
    state: 'Tamil Nadu',
    city: 'Tirunelveli',
    packageAmount: 32000,
    advancePaid: 15000,
    status: 'upcoming',
  },

  // Apr 19, 2026 is a muhurtham date
  {
    clientName: 'Shreya Venkat',
    clientPhone: '9123099887',
    eventType: 'Muhurtham',
    eventDate: '2026-04-19',
    eventTime: '07:15',
    country: 'India',
    state: 'Andhra Pradesh',
    city: 'Vijayawada',
    packageAmount: 35000,
    advancePaid: 12000,
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

console.log('Inserted', newEvents.length, 'new events\n');

// Show mixed-status days
const mixed = db.prepare(`
  SELECT eventDate, status, GROUP_CONCAT(clientName) as names
  FROM events
  GROUP BY eventDate, status
  ORDER BY eventDate
`).all();

const byDate = {};
mixed.forEach(r => {
  const d = r.eventDate;
  if (!byDate[d]) byDate[d] = [];
  byDate[d].push({ status: r.status, names: r.names });
});

console.log('Mixed-status days (upcoming + cancelled on same day):');
for (const [date, groups] of Object.entries(byDate)) {
  const statuses = groups.map(g => g.status);
  if (statuses.includes('upcoming') && statuses.includes('cancelled')) {
    console.log(`  ${date}:`);
    groups.forEach(g => console.log(`    ${g.status}: ${g.names}`));
  }
}

console.log('\nMuhurtham dates with events:');
const muhurthams = ['2026-03-01', '2026-03-04', '2026-03-05', '2026-04-14', '2026-04-15', '2026-04-19', '2026-04-20'];
muhurthams.forEach(d => {
  const evts = db.prepare('SELECT clientName, eventType FROM events WHERE eventDate = ?').all(d);
  if (evts.length > 0) {
    console.log(`  ${d}: ${evts.map(e => `${e.clientName} (${e.eventType})`).join(', ')}`);
  }
});

const total = db.prepare('SELECT COUNT(*) as cnt FROM events').get();
console.log('\nTotal events:', total.cnt);
