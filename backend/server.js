 require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { all, get, run, transaction, initializeDatabase } = require('./database');
const { startNotificationScheduler } = require('./notificationScheduler');
const {
  validateCreateEvent, validateUpdateEvent, validateEventId, validateCancelEvent, validateEventQuery,
  validateCreateTravel, validateUpdateTravel, validateTravelId, validateTravelQuery,
  validateCreateTeamContact, validateUpdateTeamContact, validateTeamContactId,
  validateCreateTeamMember, validateUpdateTeamMember, validateTeamMemberId,
  validateSignup, validateLogin, validateVerifyOTP, validateResendOTP, validateUpdateProfile,
  validateUpdateSettings, validateFeedback,
} = require('./validators');

// ── Email transport (Brevo SMTP) ─────────────
let mailTransporter = null;
function initMailTransport() {
  if (process.env.SMTP_HOST) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('📧 OTP email transport: SMTP configured');
  } else {
    console.log('📧 OTP email transport: not configured (OTPs logged to console)');
  }
}

async function sendOTPEmail(to, code, purpose) {
  const isSignup = purpose === 'verify';
  const subject = isSignup ? `MUA Planner – Verify your account` : `MUA Planner – Login OTP`;
  const html = `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #FAF8F5; border-radius: 16px;">
      <div style="background: #7B2D52; color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 20px;">✨ MUA Planner</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${isSignup ? 'Account Verification' : 'Login Verification'}</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #E8E4DF; text-align: center;">
        <p style="color: #5C5C70; font-size: 14px; margin: 0 0 16px;">Your one-time password is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #7B2D52; letter-spacing: 6px; padding: 16px; background: #F7F5F2; border-radius: 8px;">${code}</div>
        <p style="color: #9E9EB0; font-size: 12px; margin: 16px 0 0;">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
      <p style="text-align: center; color: #9E9EB0; font-size: 11px; margin-top: 16px;">Sent by MUA Planner</p>
    </div>
  `;

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: `"MUA Planner" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        text: `Your MUA Planner OTP is: ${code}. It expires in 10 minutes.`,
        html,
      });
      console.log(`📧 OTP email sent to ${to}`);
    } catch (err) {
      console.error(`📧 OTP email failed for ${to}:`, err.message);
    }
  } else {
    console.log(`\n📧 OTP for ${to}: ${code}\n`);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Extract userId from headers for data isolation
app.use((req, res, next) => {
  req.userId = req.headers['x-user-id'] || null;
  next();
});

// Middleware to require userId for protected routes
const requireUserId = (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({ success: false, error: 'User ID required' });
  }
  next();
};

// ─────────────────────────────────────────────
// EVENTS API
// ─────────────────────────────────────────────

// GET /api/events — List all events for the user
// Optional query: ?status=upcoming|completed|cancelled  &search=name
app.get('/api/events', requireUserId, validateEventQuery, async (req, res) => {
  try {
    // Auto-complete: mark upcoming events with past dates as completed
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    await run(
      `UPDATE events SET status = 'completed', updatedAt = ?
       WHERE userId = ? AND status = 'upcoming' AND eventDate != '' AND eventDate <= ?`,
      now, req.userId, today
    );

    const { status, search } = req.query;
    let sql = `SELECT e.*,
      (SELECT STRING_AGG(DISTINCT t.travelMode, ',') FROM travel t WHERE t.eventId = e.id) AS "travelModes"
      FROM events e`;
    const params = [];
    const conditions = ['e.userId = ?'];
    params.push(req.userId);

    if (status && ['upcoming', 'completed', 'cancelled'].includes(status)) {
      conditions.push('e.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('e.clientName LIKE ?');
      params.push(`%${search}%`);
    }
    sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY e.createdAt DESC';

    const events = await all(sql, ...params);
    res.json({ success: true, data: events });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/events/:id — Get single event details
app.get('/api/events/:id', requireUserId, validateEventId, async (req, res) => {
  try {
    const event = await get('SELECT * FROM events WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events — Create a new event
app.post('/api/events', requireUserId, validateCreateEvent, async (req, res) => {
  try {
    const b = req.body;

    if (!b.clientName || !b.eventType) {
      return res.status(400).json({
        success: false,
        error: 'Client Name and Event Type are required',
      });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO events (
        id, userId, clientName, clientPhone, alternativePhone, emailAddress,
        eventType, country, state, city, buildingName, address, locationDirection,
        workLocationDifferent, workCountry, workState, workCity,
        workBuildingName, workAddress, workLocationDirection,
        typeOfMakeup, packageAmount, advancePaid,
        touchupRequired, touchupCount, touchupAmount,
        extraSareeDrapes, sareeDrapesCount, sareeDrapesAmount,
        waitingRequired, waitingHours, waitingAmount,
        extraMakeup, extraMakeupCount, extraMakeupAmount,
        extraHairdo, extraHairdoCount, extraHairdoAmount,
        eventDate, eventTime, notes, status, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, 'upcoming', ?, ?
      )
    `,
      id, req.userId, b.clientName, b.clientPhone || '', b.alternativePhone || '', b.emailAddress || '',
      b.eventType, b.country || '', b.state || '', b.city || '', b.buildingName || '', b.address || '', b.locationDirection || '',
      b.workLocationDifferent ? 1 : 0, b.workCountry || '', b.workState || '', b.workCity || '',
      b.workBuildingName || '', b.workAddress || '', b.workLocationDirection || '',
      b.typeOfMakeup || '', b.packageAmount || 0, b.advancePaid || 0,
      b.touchupRequired ? 1 : 0, b.touchupCount || 0, b.touchupAmount || 0,
      b.extraSareeDrapes ? 1 : 0, b.sareeDrapesCount || 0, b.sareeDrapesAmount || 0,
      b.waitingRequired ? 1 : 0, b.waitingHours || 0, b.waitingAmount || 0,
      b.extraMakeup ? 1 : 0, b.extraMakeupCount || 0, b.extraMakeupAmount || 0,
      b.extraHairdo ? 1 : 0, b.extraHairdoCount || 0, b.extraHairdoAmount || 0,
      b.eventDate || '', b.eventTime || '', b.notes || '', now, now
    );

    const newEvent = await get('SELECT * FROM events WHERE id = ?', id);
    res.status(201).json({ success: true, data: newEvent });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/events/:id — Update an event
app.put('/api/events/:id', requireUserId, validateUpdateEvent, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM events WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const b = req.body;
    const now = new Date().toISOString();

    await run(`
      UPDATE events SET
        clientName = ?, clientPhone = ?, alternativePhone = ?, emailAddress = ?,
        eventType = ?, country = ?, state = ?, city = ?,
        buildingName = ?, address = ?, locationDirection = ?,
        workLocationDifferent = ?, workCountry = ?, workState = ?, workCity = ?,
        workBuildingName = ?, workAddress = ?, workLocationDirection = ?,
        typeOfMakeup = ?, packageAmount = ?, advancePaid = ?,
        touchupRequired = ?, touchupCount = ?, touchupAmount = ?,
        extraSareeDrapes = ?, sareeDrapesCount = ?, sareeDrapesAmount = ?,
        waitingRequired = ?, waitingHours = ?, waitingAmount = ?,
        extraMakeup = ?, extraMakeupCount = ?, extraMakeupAmount = ?,
        extraHairdo = ?, extraHairdoCount = ?, extraHairdoAmount = ?,
        eventDate = ?, eventTime = ?, notes = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `,
      b.clientName ?? existing.clientName,
      b.clientPhone ?? existing.clientPhone,
      b.alternativePhone ?? existing.alternativePhone,
      b.emailAddress ?? existing.emailAddress,
      b.eventType ?? existing.eventType,
      b.country ?? existing.country,
      b.state ?? existing.state,
      b.city ?? existing.city,
      b.buildingName ?? existing.buildingName,
      b.address ?? existing.address,
      b.locationDirection ?? existing.locationDirection,
      b.workLocationDifferent !== undefined ? (b.workLocationDifferent ? 1 : 0) : existing.workLocationDifferent,
      b.workCountry ?? existing.workCountry,
      b.workState ?? existing.workState,
      b.workCity ?? existing.workCity,
      b.workBuildingName ?? existing.workBuildingName,
      b.workAddress ?? existing.workAddress,
      b.workLocationDirection ?? existing.workLocationDirection,
      b.typeOfMakeup ?? existing.typeOfMakeup,
      b.packageAmount ?? existing.packageAmount,
      b.advancePaid ?? existing.advancePaid,
      b.touchupRequired !== undefined ? (b.touchupRequired ? 1 : 0) : existing.touchupRequired,
      b.touchupCount ?? existing.touchupCount,
      b.touchupAmount ?? existing.touchupAmount,
      b.extraSareeDrapes !== undefined ? (b.extraSareeDrapes ? 1 : 0) : existing.extraSareeDrapes,
      b.sareeDrapesCount ?? existing.sareeDrapesCount,
      b.sareeDrapesAmount ?? existing.sareeDrapesAmount,
      b.waitingRequired !== undefined ? (b.waitingRequired ? 1 : 0) : existing.waitingRequired,
      b.waitingHours ?? existing.waitingHours,
      b.waitingAmount ?? existing.waitingAmount,
      b.extraMakeup !== undefined ? (b.extraMakeup ? 1 : 0) : existing.extraMakeup,
      b.extraMakeupCount ?? existing.extraMakeupCount,
      b.extraMakeupAmount ?? existing.extraMakeupAmount,
      b.extraHairdo !== undefined ? (b.extraHairdo ? 1 : 0) : existing.extraHairdo,
      b.extraHairdoCount ?? existing.extraHairdoCount,
      b.extraHairdoAmount ?? existing.extraHairdoAmount,
      b.eventDate ?? existing.eventDate,
      b.eventTime ?? existing.eventTime,
      b.notes ?? existing.notes,
      b.status ?? existing.status,
      now, req.params.id
    );

    const updated = await get('SELECT * FROM events WHERE id = ?', req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/events/:id/complete — Mark an event as completed
app.put('/api/events/:id/complete', requireUserId, validateEventId, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM events WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const now = new Date().toISOString();
    await run(`UPDATE events SET status = 'completed', updatedAt = ? WHERE id = ? AND userId = ?`, now, req.params.id, req.userId);

    const updated = await get('SELECT * FROM events WHERE id = ?', req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error completing event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/events/:id/cancel — Cancel an event with sub-form data
app.put('/api/events/:id/cancel', requireUserId, validateCancelEvent, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM events WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const { cancelDate, cancelReason, moneyOption, moneyAmount } = req.body;
    const now = new Date().toISOString();

    await run(`
      UPDATE events SET
        status = 'cancelled', cancelDate = ?, cancelReason = ?,
        moneyOption = ?, moneyAmount = ?, updatedAt = ?
      WHERE id = ? AND userId = ?
    `,
      cancelDate || new Date().toISOString().split('T')[0],
      cancelReason || '', moneyOption || '', moneyAmount || 0, now, req.params.id, req.userId
    );

    const updated = await get('SELECT * FROM events WHERE id = ?', req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error cancelling event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/events/:id/restore — Restore a cancelled event back to upcoming
app.put('/api/events/:id/restore', requireUserId, validateEventId, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM events WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const now = new Date().toISOString();
    await run(`
      UPDATE events SET
        status = 'upcoming', cancelDate = '', cancelReason = '',
        moneyOption = '', moneyAmount = 0, updatedAt = ?
      WHERE id = ? AND userId = ?
    `, now, req.params.id, req.userId);

    const updated = await get('SELECT * FROM events WHERE id = ?', req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error restoring event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/events/:id — Delete an event (returns deleted data for undo)
app.delete('/api/events/:id', requireUserId, validateEventId, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM events WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    await run('DELETE FROM events WHERE id = ? AND userId = ?', req.params.id, req.userId);
    res.json({ success: true, message: 'Event deleted', data: existing });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/events/restore — Re-insert a previously deleted event (undo)
app.post('/api/events/restore', requireUserId, async (req, res) => {
  try {
    const e = req.body;
    if (!e.id) {
      return res.status(400).json({ success: false, error: 'Event data with id is required' });
    }

    const exists = await get('SELECT id FROM events WHERE id = ? AND userId = ?', e.id, req.userId);
    if (exists) {
      const event = await get('SELECT * FROM events WHERE id = ?', e.id);
      return res.json({ success: true, data: event });
    }

    await run(`
      INSERT INTO events (
        id, userId, clientName, clientPhone, alternativePhone, emailAddress,
        eventType, country, state, city, buildingName, address, locationDirection,
        workLocationDifferent, workCountry, workState, workCity,
        workBuildingName, workAddress, workLocationDirection,
        typeOfMakeup, packageAmount, advancePaid,
        touchupRequired, touchupCount, touchupAmount,
        extraSareeDrapes, sareeDrapesCount, sareeDrapesAmount,
        waitingRequired, waitingHours, waitingAmount,
        extraMakeup, extraMakeupCount, extraMakeupAmount,
        extraHairdo, extraHairdoCount, extraHairdoAmount,
        eventDate, eventTime, notes, status,
        cancelDate, cancelReason, moneyOption, moneyAmount,
        createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `,
      e.id, req.userId, e.clientName || '', e.clientPhone || '', e.alternativePhone || '', e.emailAddress || '',
      e.eventType || '', e.country || '', e.state || '', e.city || '', e.buildingName || '', e.address || '', e.locationDirection || '',
      e.workLocationDifferent ? 1 : 0, e.workCountry || '', e.workState || '', e.workCity || '',
      e.workBuildingName || '', e.workAddress || '', e.workLocationDirection || '',
      e.typeOfMakeup || '', e.packageAmount || 0, e.advancePaid || 0,
      e.touchupRequired ? 1 : 0, e.touchupCount || 0, e.touchupAmount || 0,
      e.extraSareeDrapes ? 1 : 0, e.sareeDrapesCount || 0, e.sareeDrapesAmount || 0,
      e.waitingRequired ? 1 : 0, e.waitingHours || 0, e.waitingAmount || 0,
      e.extraMakeup ? 1 : 0, e.extraMakeupCount || 0, e.extraMakeupAmount || 0,
      e.extraHairdo ? 1 : 0, e.extraHairdoCount || 0, e.extraHairdoAmount || 0,
      e.eventDate || '', e.eventTime || '', e.notes || '', e.status || 'upcoming',
      e.cancelDate || '', e.cancelReason || '', e.moneyOption || '', e.moneyAmount || 0,
      e.createdAt || new Date().toISOString(), new Date().toISOString()
    );

    const restored = await get('SELECT * FROM events WHERE id = ?', e.id);
    res.status(201).json({ success: true, data: restored });
  } catch (err) {
    console.error('Error restoring event:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// TRAVEL API
// ─────────────────────────────────────────────

// GET /api/travel — List travel records (optionally filter by eventId, eventStatus)
app.get('/api/travel', requireUserId, validateTravelQuery, async (req, res) => {
  try {
    const { eventId, travelMode, travelStatus, eventStatus } = req.query;
    let sql = `
      SELECT t.*, e.clientName, e.eventType, e.eventDate, e.city, e.status AS eventStatus
      FROM travel t
      LEFT JOIN events e ON t.eventId = e.id
    `;
    const params = [];
    const conditions = ['e.userId = ?'];
    params.push(req.userId);

    if (eventId) {
      conditions.push('t.eventId = ?');
      params.push(eventId);
    }
    if (travelMode) {
      conditions.push('t.travelMode = ?');
      params.push(travelMode);
    }
    if (travelStatus) {
      conditions.push('t.travelStatus = ?');
      params.push(travelStatus);
    }
    if (eventStatus) {
      conditions.push('e.status = ?');
      params.push(eventStatus);
    }
    sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY t.travelDate ASC, t.legOrder ASC';

    const records = await all(sql, ...params);
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Error fetching travel records:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/travel/summary/:eventId — Travel summary for an event
app.get('/api/travel/summary/:eventId', requireUserId, async (req, res) => {
  try {
    // Verify event belongs to user
    const event = await get('SELECT id FROM events WHERE id = ? AND userId = ?', req.params.eventId, req.userId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const records = await all(
      `SELECT * FROM travel WHERE eventId = ? ORDER BY legOrder ASC, travelDate ASC`,
      req.params.eventId
    );

    const totalCost = records.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const legCount = records.length;

    res.json({
      success: true,
      data: { records, totalCost, legCount },
    });
  } catch (err) {
    console.error('Error fetching travel summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/travel/:id — Single travel record
app.get('/api/travel/:id', requireUserId, validateTravelId, async (req, res) => {
  try {
    const record = await get(
      `SELECT t.*, e.clientName, e.eventType, e.eventDate, e.city
       FROM travel t LEFT JOIN events e ON t.eventId = e.id
       WHERE t.id = ? AND e.userId = ?`,
      req.params.id, req.userId
    );
    if (!record) {
      return res.status(404).json({ success: false, error: 'Travel record not found' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    console.error('Error fetching travel record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/travel — Create a travel record
app.post('/api/travel', requireUserId, validateCreateTravel, async (req, res) => {
  try {
    const b = req.body;

    if (!b.eventId || !b.travelMode) {
      return res.status(400).json({
        success: false,
        error: 'eventId and travelMode are required',
      });
    }

    // Validate event exists and belongs to user
    const event = await get('SELECT id FROM events WHERE id = ? AND userId = ?', b.eventId, req.userId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Auto-assign legOrder
    const maxLeg = await get(
      'SELECT MAX(legOrder) as maxLeg FROM travel WHERE eventId = ?',
      b.eventId
    );
    const legOrder = b.legOrder || ((maxLeg?.maxLeg || 0) + 1);

    const id = uuidv4();
    const now = new Date().toISOString();

    await run(`
      INSERT INTO travel (
        id, eventId, legOrder, travelMode,
        travelStatus, bookingStatus, travelDate, returnDate,
        totalCost, notes, attachmentPath,
        numTravellers,
        departureCity, arrivalCity, airlineName,
        trainNumber, trainName, departureStation, arrivalStation,
        cabProvider, pickupLocation, dropLocation, estimatedFare, driverContact,
        startingLocation, destination, distance, fuelCost, tollCharges, parkingCharges,
        busOperator, departureLocation, arrivalLocation,
        bookedByArtist,
        createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?,
        ?, ?
      )
    `,
      id, b.eventId, legOrder, b.travelMode,
      b.travelStatus || 'planned', b.bookingStatus || 'not_booked',
      b.travelDate || '', b.returnDate || '',
      b.totalCost || 0, b.notes || '', b.attachmentPath || '',
      b.numTravellers || 1,
      b.departureCity || '', b.arrivalCity || '', b.airlineName || '',
      b.trainNumber || '', b.trainName || '', b.departureStation || '', b.arrivalStation || '',
      b.cabProvider || '', b.pickupLocation || '', b.dropLocation || '',
      b.estimatedFare || 0, b.driverContact || '',
      b.startingLocation || '', b.destination || '', b.distance || 0,
      b.fuelCost || 0, b.tollCharges || 0, b.parkingCharges || 0,
      b.busOperator || '', b.departureLocation || '', b.arrivalLocation || '',
      b.bookedByArtist ? 1 : 0,
      now, now
    );

    const newRecord = await get('SELECT * FROM travel WHERE id = ?', id);
    res.status(201).json({ success: true, data: newRecord });
  } catch (err) {
    console.error('Error creating travel record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/travel/:id — Update a travel record
app.put('/api/travel/:id', requireUserId, validateUpdateTravel, async (req, res) => {
  try {
    // Verify travel record exists and belongs to user's event
    const existing = await get(
      `SELECT t.* FROM travel t JOIN events e ON t.eventId = e.id WHERE t.id = ? AND e.userId = ?`,
      req.params.id, req.userId
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Travel record not found' });
    }

    const b = req.body;
    const now = new Date().toISOString();

    await run(`
      UPDATE travel SET
        travelMode = ?, legOrder = ?,
        travelStatus = ?, bookingStatus = ?,
        travelDate = ?, returnDate = ?,
        totalCost = ?, notes = ?, attachmentPath = ?,
        numTravellers = ?,
        departureCity = ?, arrivalCity = ?, airlineName = ?,
        trainNumber = ?, trainName = ?, departureStation = ?, arrivalStation = ?,
        cabProvider = ?, pickupLocation = ?, dropLocation = ?,
        estimatedFare = ?, driverContact = ?,
        startingLocation = ?, destination = ?, distance = ?,
        fuelCost = ?, tollCharges = ?, parkingCharges = ?,
        busOperator = ?, departureLocation = ?, arrivalLocation = ?,
        bookedByArtist = ?,
        updatedAt = ?
      WHERE id = ?
    `,
      b.travelMode ?? existing.travelMode,
      b.legOrder ?? existing.legOrder,
      b.travelStatus ?? existing.travelStatus,
      b.bookingStatus ?? existing.bookingStatus,
      b.travelDate ?? existing.travelDate,
      b.returnDate ?? existing.returnDate,
      b.totalCost ?? existing.totalCost,
      b.notes ?? existing.notes,
      b.attachmentPath ?? existing.attachmentPath,
      b.numTravellers ?? existing.numTravellers,
      b.departureCity ?? existing.departureCity,
      b.arrivalCity ?? existing.arrivalCity,
      b.airlineName ?? existing.airlineName,
      b.trainNumber ?? existing.trainNumber,
      b.trainName ?? existing.trainName,
      b.departureStation ?? existing.departureStation,
      b.arrivalStation ?? existing.arrivalStation,
      b.cabProvider ?? existing.cabProvider,
      b.pickupLocation ?? existing.pickupLocation,
      b.dropLocation ?? existing.dropLocation,
      b.estimatedFare ?? existing.estimatedFare,
      b.driverContact ?? existing.driverContact,
      b.startingLocation ?? existing.startingLocation,
      b.destination ?? existing.destination,
      b.distance ?? existing.distance,
      b.fuelCost ?? existing.fuelCost,
      b.tollCharges ?? existing.tollCharges,
      b.parkingCharges ?? existing.parkingCharges,
      b.busOperator ?? existing.busOperator,
      b.departureLocation ?? existing.departureLocation,
      b.arrivalLocation ?? existing.arrivalLocation,
      b.bookedByArtist !== undefined ? (b.bookedByArtist ? 1 : 0) : existing.bookedByArtist,
      now, req.params.id
    );

    const updated = await get('SELECT * FROM travel WHERE id = ?', req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating travel record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/travel/:id — Delete a travel record
app.delete('/api/travel/:id', requireUserId, validateTravelId, async (req, res) => {
  try {
    // Verify travel record exists and belongs to user's event
    const existing = await get(
      `SELECT t.* FROM travel t JOIN events e ON t.eventId = e.id WHERE t.id = ? AND e.userId = ?`,
      req.params.id, req.userId
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Travel record not found' });
    }

    await run('DELETE FROM travel WHERE id = ?', req.params.id);
    res.json({ success: true, message: 'Travel record deleted', data: existing });
  } catch (err) {
    console.error('Error deleting travel record:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// TEAM CONTACTS API (frequent team members)
// ─────────────────────────────────────────────

// GET /api/team-contacts — list all contacts with pending balance
app.get('/api/team-contacts', requireUserId, async (req, res) => {
  try {
    const rows = await all(
      `SELECT tc.*,
              COALESCE(SUM(tm.amount), 0) AS totalAmount,
              COALESCE(SUM(tm.amountPaid), 0) AS totalPaid,
              COALESCE(SUM(tm.amount - tm.amountPaid), 0) AS pendingBalance
       FROM team_contacts tc
       LEFT JOIN team_members tm ON tc.id = tm.contactId
       WHERE tc.userId = ?
       GROUP BY tc.id
       ORDER BY tc.name ASC`,
      req.userId
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching team contacts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/team-contacts/:id/payments — payment detail per contact
app.get('/api/team-contacts/:id/payments', requireUserId, async (req, res) => {
  try {
    const contact = await get('SELECT * FROM team_contacts WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    const events = await all(
      `SELECT tm.id, tm.eventId, tm.teamRole, tm.amount, tm.amountPaid, tm.paymentStatus,
              e.clientName AS eventName, e.eventType, e.eventDate, e.city AS eventCity
       FROM team_members tm
       LEFT JOIN events e ON tm.eventId = e.id
       WHERE tm.contactId = ? AND e.userId = ?
       ORDER BY e.eventDate DESC`,
      req.params.id, req.userId
    );

    const totalAmount = events.reduce((s, r) => s + (r.amount || 0), 0);
    const totalPaid = events.reduce((s, r) => s + (r.amountPaid || 0), 0);

    res.json({
      success: true,
      data: {
        contact,
        events,
        totalAmount,
        totalPaid,
        pendingBalance: totalAmount - totalPaid,
        eventCount: events.length,
      },
    });
  } catch (err) {
    console.error('Error fetching contact payments:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/team-contacts — create contact
app.post('/api/team-contacts', requireUserId, validateCreateTeamContact, async (req, res) => {
  try {
    const { name, defaultRole, phone, email, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();
    await run(
      `INSERT INTO team_contacts (id, userId, name, defaultRole, phone, email, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, req.userId, name.trim(), defaultRole || 'assistant', phone || '', email || '', notes || '', now, now
    );
    const created = await get('SELECT * FROM team_contacts WHERE id = ?', id);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('Error creating team contact:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/team-contacts/:id — update contact
app.put('/api/team-contacts/:id', requireUserId, validateUpdateTeamContact, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM team_contacts WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!existing) return res.status(404).json({ success: false, error: 'Contact not found' });
    const { name, defaultRole, phone, email, notes } = req.body;
    const now = new Date().toISOString();
    await run(
      `UPDATE team_contacts SET name = ?, defaultRole = ?, phone = ?, email = ?, notes = ?, updatedAt = ? WHERE id = ? AND userId = ?`,
      name?.trim() ?? existing.name, defaultRole ?? existing.defaultRole,
      phone ?? existing.phone, email ?? existing.email, notes ?? existing.notes, now, req.params.id, req.userId
    );
    const updated = await get('SELECT * FROM team_contacts WHERE id = ?', req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating team contact:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/team-contacts/:id — delete contact
app.delete('/api/team-contacts/:id', requireUserId, validateTeamContactId, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM team_contacts WHERE id = ? AND userId = ?', req.params.id, req.userId);
    if (!existing) return res.status(404).json({ success: false, error: 'Contact not found' });
    await run('DELETE FROM team_contacts WHERE id = ? AND userId = ?', req.params.id, req.userId);
    res.json({ success: true, message: 'Contact deleted', data: existing });
  } catch (err) {
    console.error('Error deleting team contact:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// TEAM MEMBERS API
// ─────────────────────────────────────────────

// GET /api/team?eventId=...
app.get('/api/team', requireUserId, async (req, res) => {
  try {
    const { eventId } = req.query;
    let sql = `SELECT t.*, e.clientName AS eventName, e.eventType, e.eventDate
               FROM team_members t LEFT JOIN events e ON t.eventId = e.id
               WHERE e.userId = ?`;
    const params = [req.userId];
    if (eventId) {
      sql += ' AND t.eventId = ?';
      params.push(eventId);
    }
    sql += ' ORDER BY t.createdAt DESC';
    const rows = await all(sql, ...params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/team/summary/:eventId — Team summary for an event
app.get('/api/team/summary/:eventId', requireUserId, async (req, res) => {
  try {
    // Verify event belongs to user
    const event = await get('SELECT id FROM events WHERE id = ? AND userId = ?', req.params.eventId, req.userId);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    const rows = await all(
      'SELECT * FROM team_members WHERE eventId = ? ORDER BY teamRole ASC, createdAt ASC',
      req.params.eventId
    );
    const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);
    const totalPaid = rows.reduce((s, r) => s + (r.amountPaid || 0), 0);
    res.json({
      success: true,
      data: { members: rows, totalAmount, totalPaid, count: rows.length },
    });
  } catch (err) {
    console.error('Error fetching team summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/team/:id — Single team member
app.get('/api/team/:id', requireUserId, validateTeamMemberId, async (req, res) => {
  try {
    const row = await get(
      `SELECT t.*, e.clientName AS eventName, e.eventType, e.eventDate
       FROM team_members t LEFT JOIN events e ON t.eventId = e.id
       WHERE t.id = ? AND e.userId = ?`,
      req.params.id, req.userId
    );
    if (!row) return res.status(404).json({ success: false, error: 'Team member not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('Error fetching team member:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/team — Create team member
app.post('/api/team', requireUserId, validateCreateTeamMember, async (req, res) => {
  try {
    const b = req.body;
    if (!b.eventId || !b.teamRole) {
      return res.status(400).json({ success: false, error: 'eventId and teamRole are required' });
    }
    // Check event exists and belongs to user
    const ev = await get('SELECT id FROM events WHERE id = ? AND userId = ?', b.eventId, req.userId);
    if (!ev) return res.status(404).json({ success: false, error: 'Event not found' });

    // Enforce max per role
    const maxByRole = { hairstylist: 5, makeup_artist: 5, saree_drapist: 5, assistant: 5, driver: 5, photographer: 5, event_planner: 5 };
    const max = maxByRole[b.teamRole] || 5;
    const existing = await all(
      'SELECT id FROM team_members WHERE eventId = ? AND teamRole = ?',
      b.eventId, b.teamRole
    );
    if (existing.length >= max) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${max} ${b.teamRole.replace('_', ' ')}(s) allowed per event`,
      });
    }

    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();
    const paymentStatus = (b.amountPaid || 0) >= (b.amount || 0) && (b.amount || 0) > 0
      ? 'paid'
      : (b.amountPaid || 0) > 0 ? 'partial' : 'pending';

    await run(
      `INSERT INTO team_members (id, eventId, teamRole, memberName, contactId, amount, amountPaid, paymentStatus, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, b.eventId, b.teamRole, b.memberName || '', b.contactId || '', b.amount || 0, b.amountPaid || 0,
      paymentStatus, b.notes || '', now, now
    );
    const newRecord = await get('SELECT * FROM team_members WHERE id = ?', id);
    res.status(201).json({ success: true, data: newRecord });
  } catch (err) {
    console.error('Error creating team member:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/team/:id — Update team member
app.put('/api/team/:id', requireUserId, validateUpdateTeamMember, async (req, res) => {
  try {
    // Verify team member exists and belongs to user's event
    const existing = await get(
      `SELECT tm.* FROM team_members tm JOIN events e ON tm.eventId = e.id WHERE tm.id = ? AND e.userId = ?`,
      req.params.id, req.userId
    );
    if (!existing) return res.status(404).json({ success: false, error: 'Team member not found' });

    const b = req.body;
    const amount = b.amount ?? existing.amount;
    const amountPaid = b.amountPaid ?? existing.amountPaid;
    const paymentStatus = amountPaid >= amount && amount > 0
      ? 'paid'
      : amountPaid > 0 ? 'partial' : 'pending';
    const now = new Date().toISOString();

    await run(
      `UPDATE team_members SET
        teamRole = ?, memberName = ?, amount = ?, amountPaid = ?,
        paymentStatus = ?, notes = ?, updatedAt = ?
       WHERE id = ?`,
      b.teamRole ?? existing.teamRole,
      b.memberName ?? existing.memberName,
      amount, amountPaid, paymentStatus,
      b.notes ?? existing.notes, now, req.params.id
    );
    const updated = await get('SELECT * FROM team_members WHERE id = ?', req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating team member:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/team/:id — Delete team member
app.delete('/api/team/:id', requireUserId, validateTeamMemberId, async (req, res) => {
  try {
    // Verify team member exists and belongs to user's event
    const existing = await get(
      `SELECT tm.* FROM team_members tm JOIN events e ON tm.eventId = e.id WHERE tm.id = ? AND e.userId = ?`,
      req.params.id, req.userId
    );
    if (!existing) return res.status(404).json({ success: false, error: 'Team member not found' });
    await run('DELETE FROM team_members WHERE id = ?', req.params.id);
    res.json({ success: true, message: 'Team member deleted', data: existing });
  } catch (err) {
    console.error('Error deleting team member:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// SETTINGS API
// ─────────────────────────────────────────────

// GET /api/settings — Get all settings as key → value object
app.get('/api/settings', requireUserId, async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings WHERE userId = ?', req.userId);
    const data = {};
    rows.forEach(r => { data[r.key] = r.value; });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings — Upsert one or many settings
app.put('/api/settings', requireUserId, validateUpdateSettings, async (req, res) => {
  try {
    const updates = req.body;
    const now = new Date().toISOString();
    await transaction(async (client) => {
      for (const [k, v] of Object.entries(updates)) {
        await client.run(
          `INSERT INTO settings (userId, key, value, updatedAt)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(userId, key) DO UPDATE SET value = EXCLUDED.value, updatedAt = EXCLUDED.updatedAt`,
          req.userId, k, String(v), now
        );
      }
    });

    const rows = await all('SELECT key, value FROM settings WHERE userId = ?', req.userId);
    const data = {};
    rows.forEach(r => { data[r.key] = r.value; });
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// FEEDBACK API
// ─────────────────────────────────────────────

// POST /api/feedback — Submit feedback
app.post('/api/feedback', validateFeedback, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    const id = uuidv4();
    await run('INSERT INTO feedback (id, subject, message, createdAt) VALUES (?, ?, ?, ?)',
      id, (subject || '').trim(), message.trim(), new Date().toISOString()
    );
    res.json({ success: true, data: { id, subject: subject || '', message } });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// DATA MANAGEMENT
// ─────────────────────────────────────────────

// DELETE /api/data/clear — Clear all app data and reset settings
app.delete('/api/data/clear', async (req, res) => {
  try {
    await transaction(async (client) => {
      await client.run('DELETE FROM notifications');
      await client.run('DELETE FROM travel');
      await client.run('DELETE FROM events');
      await client.run('DELETE FROM feedback');
      await client.run('DELETE FROM settings');
      // Re-seed defaults
      const defaults = {
        themeColor: '#7B2D52', colorMode: 'light', fontSize: 'medium',
        notificationsEnabled: 'false', notifyBefore: '60',
        passcodeLock: 'false', passcode: '', mapsEnabled: 'true',
      };
      for (const [k, v] of Object.entries(defaults)) {
        await client.run('INSERT INTO settings (key, value) VALUES (?, ?)', k, v);
      }
    });
    res.json({ success: true, message: 'All app data cleared and settings reset' });
  } catch (err) {
    console.error('Error clearing data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/auth/signup — Register with email, send OTP
app.post('/api/auth/signup', validateSignup, async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists and is verified
    const existing = await get('SELECT * FROM users WHERE email = ?', cleanEmail);
    if (existing && existing.verified) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists. Please login.' });
    }

    // Create or update user record
    const now = new Date().toISOString();
    if (!existing) {
      const id = uuidv4();
      await run('INSERT INTO users (id, email, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', id, cleanEmail, (name || '').trim(), now, now);
    } else {
      await run('UPDATE users SET name = ?, updatedAt = ? WHERE email = ?', (name || existing.name || '').trim(), now, cleanEmail);
    }

    // Invalidate old OTPs
    await run('UPDATE otp SET used = 1 WHERE email = ? AND used = 0', cleanEmail);

    // Generate and store new OTP (expires in 10 min)
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await run('INSERT INTO otp (email, code, purpose, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)', cleanEmail, code, 'verify', expiresAt, now);

    // Send OTP email
    await sendOTPEmail(cleanEmail, code, 'verify');

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Error in signup:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/verify — Verify OTP and activate account
app.post('/api/auth/verify', validateVerifyOTP, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Find valid OTP
    const otp = await get(
      `SELECT * FROM otp WHERE email = ? AND code = ? AND used = 0 AND purpose = 'verify'
       ORDER BY createdAt DESC LIMIT 1`,
      cleanEmail, code.trim()
    );

    if (!otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP. Please try again.' });
    }

    // Check expiry
    if (new Date(otp.expiresAt) < new Date()) {
      await run('UPDATE otp SET used = 1 WHERE id = ?', otp.id);
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    // Mark OTP as used
    await run('UPDATE otp SET used = 1 WHERE id = ?', otp.id);

    // Verify the user
    const now = new Date().toISOString();
    await run('UPDATE users SET verified = 1, updatedAt = ? WHERE email = ?', now, cleanEmail);

    const user = await get('SELECT id, email, name, verified, createdAt FROM users WHERE email = ?', cleanEmail);
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login — Login with email, send OTP
app.post('/api/auth/login', validateLogin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();

    const user = await get('SELECT * FROM users WHERE email = ? AND verified = 1', cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email. Please sign up first.' });
    }

    // Invalidate old OTPs
    await run('UPDATE otp SET used = 1 WHERE email = ? AND used = 0', cleanEmail);

    // Generate and store new OTP
    const code = generateOTP();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await run('INSERT INTO otp (email, code, purpose, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)', cleanEmail, code, 'login', expiresAt, now);

    await sendOTPEmail(cleanEmail, code, 'login');

    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login/verify — Verify login OTP
app.post('/api/auth/login/verify', validateVerifyOTP, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required' });
    }
    const cleanEmail = email.trim().toLowerCase();

    const otp = await get(
      `SELECT * FROM otp WHERE email = ? AND code = ? AND used = 0 AND purpose = 'login'
       ORDER BY createdAt DESC LIMIT 1`,
      cleanEmail, code.trim()
    );

    if (!otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP. Please try again.' });
    }

    if (new Date(otp.expiresAt) < new Date()) {
      await run('UPDATE otp SET used = 1 WHERE id = ?', otp.id);
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    await run('UPDATE otp SET used = 1 WHERE id = ?', otp.id);

    const user = await get('SELECT id, email, name, verified, createdAt FROM users WHERE email = ?', cleanEmail);
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Error verifying login OTP:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/resend — Resend OTP for either purpose
app.post('/api/auth/resend', validateResendOTP, async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const otpPurpose = purpose || 'verify';

    // Invalidate old OTPs
    await run('UPDATE otp SET used = 1 WHERE email = ? AND used = 0', cleanEmail);

    const code = generateOTP();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await run('INSERT INTO otp (email, code, purpose, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)', cleanEmail, code, otpPurpose, expiresAt, now);

    console.log(`\n📧 Resent OTP for ${cleanEmail}: ${code}\n`);

    res.json({ success: true, message: 'A new OTP has been sent to your email' });
  } catch (err) {
    console.error('Error resending OTP:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me/:email — Get user profile
app.get('/api/auth/me/:email', async (req, res) => {
  try {
    const cleanEmail = req.params.email.trim().toLowerCase();
    const user = await get('SELECT id, email, name, profileImage, verified, createdAt FROM users WHERE email = ? AND verified = 1', cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile — Update user profile (name, profileImage)
app.put('/api/auth/profile', requireUserId, validateUpdateProfile, async (req, res) => {
  try {
    const { name, profileImage } = req.body;
    const now = new Date().toISOString();
    
    const existing = await get('SELECT * FROM users WHERE id = ?', req.userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await run(
      `UPDATE users SET name = ?, profileimage = ?, updatedat = ? WHERE id = ?`,
      name ?? existing.name,
      profileImage ?? existing.profileImage,
      now,
      req.userId
    );

    const updated = await get('SELECT id, email, name, profileimage, verified, createdat FROM users WHERE id = ?', req.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// DASHBOARD API
// ─────────────────────────────────────────────

app.get('/api/dashboard', requireUserId, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Auto-complete past upcoming events for this user
    await run(
      `UPDATE events SET status = 'completed', updatedAt = ?
       WHERE userId = ? AND status = 'upcoming' AND eventDate != '' AND eventDate <= ?`,
      now, req.userId, today
    );

    // Today's events
    const todayEvents = await all(
      `SELECT id, clientName, eventType, city, eventTime, status
       FROM events WHERE userId = ? AND eventDate = ? AND status != 'cancelled'
       ORDER BY eventTime ASC`,
      req.userId, today
    );

    // Upcoming events (next 5, after today)
    const upcomingEvents = await all(
      `SELECT id, clientName, eventType, city, eventDate, eventTime, status
       FROM events WHERE userId = ? AND eventDate > ? AND status = 'upcoming'
       ORDER BY eventDate ASC, eventTime ASC LIMIT 5`,
      req.userId, today
    );

    // This month stats
    const monthStart = today.substring(0, 7) + '-01';
    const monthEnd = today.substring(0, 7) + '-31';

    const monthEvents = await get(
      `SELECT COUNT(*) as count FROM events
       WHERE userId = ? AND eventDate >= ? AND eventDate <= ? AND status != 'cancelled'`,
      req.userId, monthStart, monthEnd
    );

    const monthEarnings = await get(
      `SELECT COALESCE(SUM(packageAmount), 0) as total FROM events
       WHERE userId = ? AND eventDate >= ? AND eventDate <= ? AND status != 'cancelled'`,
      req.userId, monthStart, monthEnd
    );

    const pendingPayments = await get(
      `SELECT COALESCE(SUM(packageAmount - advancePaid), 0) as total FROM events
       WHERE userId = ? AND status = 'upcoming' AND packageAmount > advancePaid`,
      req.userId
    );

    // Upcoming travel needing attention (planned/not booked)
    const travelAlerts = await all(
      `SELECT t.id, t.travelMode, t.travelDate, t.travelStatus, t.bookingStatus,
              e.clientName, e.eventType, e.city
       FROM travel t LEFT JOIN events e ON t.eventId = e.id
       WHERE e.userId = ? AND t.travelDate >= ? AND (t.travelStatus = 'planned' OR t.bookingStatus = 'not_booked')
       AND e.status = 'upcoming'
       ORDER BY t.travelDate ASC LIMIT 5`,
      req.userId, today
    );

    // Total counts for summary
    const totalUpcoming = await get(
      `SELECT COUNT(*) as count FROM events WHERE userId = ? AND status = 'upcoming'`,
      req.userId
    );

    const totalCompleted = await get(
      `SELECT COUNT(*) as count FROM events WHERE userId = ? AND status = 'completed'`,
      req.userId
    );

    res.json({
      success: true,
      data: {
        todayEvents,
        upcomingEvents,
        stats: {
          monthEvents: monthEvents.count,
          monthEarnings: monthEarnings.total,
          pendingPayments: pendingPayments.total,
          totalUpcoming: totalUpcoming.count,
          totalCompleted: totalCompleted.count,
        },
        travelAlerts,
      },
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// NOTIFICATIONS API
// ─────────────────────────────────────────────

// GET /api/notifications — list notification history
// Optional query: ?email=...&status=sent|pending|failed&limit=50
app.get('/api/notifications', async (req, res) => {
  try {
    const { email, status, limit } = req.query;
    let sql = 'SELECT * FROM notifications';
    const conditions = [];
    const params = [];

    if (email) { conditions.push('email = ?'); params.push(email); }
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY scheduledFor DESC';
    sql += ` LIMIT ${parseInt(limit) || 50}`;

    const rows = await all(sql, ...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/stats — quick summary
app.get('/api/notifications/stats', async (req, res) => {
  try {
    const total = (await get('SELECT COUNT(*) as count FROM notifications')).count;
    const sent = (await get("SELECT COUNT(*) as count FROM notifications WHERE status = 'sent'")).count;
    const pending = (await get("SELECT COUNT(*) as count FROM notifications WHERE status = 'pending'")).count;
    const failed = (await get("SELECT COUNT(*) as count FROM notifications WHERE status = 'failed'")).count;
    res.json({ total, sent, pending, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  await initializeDatabase();
  initMailTransport();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MUA Planner Backend running on http://localhost:${PORT}`);
    // Start notification scheduler after server is up
    startNotificationScheduler();
  });
}
start().catch(err => { console.error('Failed to start:', err); process.exit(1); });
