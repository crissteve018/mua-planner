const { Pool } = require('pg');

// ── PostgreSQL connection pool ───────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

// ── Column-name mapping (PG lowercase → camelCase) ──
const CAMEL_COLUMNS = [
  'clientName','clientPhone','alternativePhone','emailAddress',
  'eventType','buildingName','locationDirection',
  'workLocationDifferent','workCountry','workState','workCity',
  'workBuildingName','workAddress','workLocationDirection',
  'typeOfMakeup','packageAmount','advancePaid',
  'touchupRequired','touchupCount','touchupAmount',
  'extraSareeDrapes','sareeDrapesCount','sareeDrapesAmount',
  'waitingRequired','waitingHours','waitingAmount',
  'extraMakeup','extraMakeupCount','extraMakeupAmount',
  'extraHairdo','extraHairdoCount','extraHairdoAmount',
  'eventDate','eventTime',
  'cancelDate','cancelReason','moneyOption','moneyAmount',
  'createdAt','updatedAt',
  'eventId','legOrder','travelMode','travelStatus','bookingStatus',
  'travelDate','returnDate','totalCost','attachmentPath',
  'numTravellers','departureCity','arrivalCity','airlineName',
  'trainNumber','trainName','departureStation','arrivalStation',
  'cabProvider','pickupLocation','dropLocation','estimatedFare',
  'driverContact','startingLocation','fuelCost','tollCharges',
  'parkingCharges','busOperator','departureLocation','arrivalLocation',
  'bookedByArtist',
  'expiresAt','reminderNumber','scheduledFor','sentAt',
  'eventStatus','maxLeg',
  'memberName','teamRole','amount','amountPaid','paymentStatus',
  'defaultRole','contactId',
];
const COL_MAP = {};
for (const c of CAMEL_COLUMNS) COL_MAP[c.toLowerCase()] = c;

function transformRow(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[COL_MAP[k] || k] = v;
  return out;
}

// ── Query helpers (auto-convert ? → $N, transform camelCase) ──
function toPS(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function all(sql, ...params) {
  const r = await pool.query(toPS(sql), params);
  return r.rows.map(transformRow);
}
async function get(sql, ...params) {
  const r = await pool.query(toPS(sql), params);
  return transformRow(r.rows[0]);
}
async function run(sql, ...params) {
  return pool.query(toPS(sql), params);
}

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn({
      async run(sql, ...params) { return client.query(toPS(sql), params); },
    });
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── Initialize database tables ───────────────
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      clientName TEXT NOT NULL,
      clientPhone TEXT DEFAULT '',
      alternativePhone TEXT DEFAULT '',
      emailAddress TEXT DEFAULT '',
      eventType TEXT NOT NULL,
      country TEXT DEFAULT '',
      state TEXT DEFAULT '',
      city TEXT DEFAULT '',
      buildingName TEXT DEFAULT '',
      address TEXT DEFAULT '',
      locationDirection TEXT DEFAULT '',
      workLocationDifferent INTEGER DEFAULT 0,
      workCountry TEXT DEFAULT '',
      workState TEXT DEFAULT '',
      workCity TEXT DEFAULT '',
      workBuildingName TEXT DEFAULT '',
      workAddress TEXT DEFAULT '',
      workLocationDirection TEXT DEFAULT '',
      typeOfMakeup TEXT DEFAULT '',
      packageAmount REAL DEFAULT 0,
      advancePaid REAL DEFAULT 0,
      touchupRequired INTEGER DEFAULT 0,
      touchupCount INTEGER DEFAULT 0,
      touchupAmount REAL DEFAULT 0,
      extraSareeDrapes INTEGER DEFAULT 0,
      sareeDrapesCount INTEGER DEFAULT 0,
      sareeDrapesAmount REAL DEFAULT 0,
      waitingRequired INTEGER DEFAULT 0,
      waitingHours REAL DEFAULT 0,
      waitingAmount REAL DEFAULT 0,
      extraMakeup INTEGER DEFAULT 0,
      extraMakeupCount INTEGER DEFAULT 0,
      extraMakeupAmount REAL DEFAULT 0,
      extraHairdo INTEGER DEFAULT 0,
      extraHairdoCount INTEGER DEFAULT 0,
      extraHairdoAmount REAL DEFAULT 0,
      eventDate TEXT DEFAULT '',
      eventTime TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'upcoming',
      cancelDate TEXT DEFAULT '',
      cancelReason TEXT DEFAULT '',
      moneyOption TEXT DEFAULT '',
      moneyAmount REAL DEFAULT 0,
      createdAt TEXT DEFAULT '',
      updatedAt TEXT DEFAULT ''
    )
  `);

  await pool.query(`UPDATE events SET status = 'upcoming' WHERE status = 'confirmed'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS travel (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      legOrder INTEGER DEFAULT 1,
      travelMode TEXT NOT NULL DEFAULT 'flight',
      travelStatus TEXT DEFAULT 'planned',
      bookingStatus TEXT DEFAULT 'not_booked',
      travelDate TEXT DEFAULT '',
      returnDate TEXT DEFAULT '',
      totalCost REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      attachmentPath TEXT DEFAULT '',
      numTravellers INTEGER DEFAULT 1,
      departureCity TEXT DEFAULT '',
      arrivalCity TEXT DEFAULT '',
      airlineName TEXT DEFAULT '',
      trainNumber TEXT DEFAULT '',
      trainName TEXT DEFAULT '',
      departureStation TEXT DEFAULT '',
      arrivalStation TEXT DEFAULT '',
      cabProvider TEXT DEFAULT '',
      pickupLocation TEXT DEFAULT '',
      dropLocation TEXT DEFAULT '',
      estimatedFare REAL DEFAULT 0,
      driverContact TEXT DEFAULT '',
      startingLocation TEXT DEFAULT '',
      destination TEXT DEFAULT '',
      distance REAL DEFAULT 0,
      fuelCost REAL DEFAULT 0,
      tollCharges REAL DEFAULT 0,
      parkingCharges REAL DEFAULT 0,
      busOperator TEXT DEFAULT '',
      departureLocation TEXT DEFAULT '',
      arrivalLocation TEXT DEFAULT '',
      bookedByArtist INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT '',
      updatedAt TEXT DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      teamRole TEXT NOT NULL DEFAULT 'assistant',
      memberName TEXT DEFAULT '',
      contactId TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      amountPaid REAL DEFAULT 0,
      paymentStatus TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      createdAt TEXT DEFAULT '',
      updatedAt TEXT DEFAULT ''
    )
  `);

  // Migration: add contactId column if missing (table created before column was added)
  await pool.query(`
    ALTER TABLE team_members ADD COLUMN IF NOT EXISTS contactId TEXT DEFAULT ''
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      defaultRole TEXT NOT NULL DEFAULT 'assistant',
      phone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      createdAt TEXT DEFAULT '',
      updatedAt TEXT DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updatedAt TEXT DEFAULT ''
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) as count FROM settings');
  if (parseInt(rows[0].count) === 0) {
    const defaults = {
      themeColor: '#7B2D52', colorMode: 'light', fontSize: 'medium',
      notificationsEnabled: 'false', notifyBefore: '60', notifyTimes: '1',
      passcodeLock: 'false', passcode: '', mapsEnabled: 'true',
    };
    for (const [k, v] of Object.entries(defaults)) {
      await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2)', [k, v]);
    }
    console.log('  ↳ Settings: seeded defaults');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      subject TEXT DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      createdAt TEXT DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT DEFAULT '',
      verified INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT '',
      updatedAt TEXT DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT DEFAULT 'verify',
      expiresAt TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      reminderNumber INTEGER DEFAULT 1,
      scheduledFor TEXT NOT NULL,
      sentAt TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      subject TEXT DEFAULT '',
      body TEXT DEFAULT '',
      createdAt TEXT DEFAULT ''
    )
  `);

  console.log('✅ Database initialized (PostgreSQL)');
}

module.exports = { pool, all, get, run, transaction, initializeDatabase };
