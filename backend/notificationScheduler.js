const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { all, get, run } = require('./database');

/* ═══════════════════════════════════════════════
   EMAIL TRANSPORT
   ═══════════════════════════════════════════════
   For production: replace with your SMTP credentials.
   e.g. Gmail, SendGrid, AWS SES, etc.

   For development: uses Ethereal (free fake SMTP).
   Emails are captured at https://ethereal.email
   ═══════════════════════════════════════════════ */

let transporter = null;

async function initTransport() {
  // Check if real SMTP is configured via env vars
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('📧 Email transport: Custom SMTP configured');
    return;
  }

  // Dev fallback: Ethereal fake SMTP
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Email transport: Ethereal test account ready');
    console.log(`   ↳ View sent emails at: https://ethereal.email/login`);
    console.log(`   ↳ User: ${testAccount.user}`);
    console.log(`   ↳ Pass: ${testAccount.pass}`);
  } catch (err) {
    console.error('⚠️  Failed to create Ethereal account. Emails will be logged to console only.');
    transporter = null;
  }
}

/* ─── Send an email (or log it) ────────────── */
async function sendEmail(to, subject, html) {
  const plain = html.replace(/<[^>]*>/g, ''); // strip HTML for text version

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: '"MUA Planner" <notifications@muaplanner.app>',
        to,
        subject,
        text: plain,
        html,
      });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`   ↳ Preview: ${previewUrl}`);
      }
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`   ↳ Email send failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // Fallback: log to console
  console.log(`\n📧 EMAIL NOTIFICATION (console only)`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${plain}\n`);
  return { success: true, messageId: 'console-' + Date.now() };
}

/* ─── Build email HTML ─────────────────────── */
function buildReminderEmail(event, minutesBefore) {
  const timeLabel = minutesBefore >= 1440
    ? `${Math.round(minutesBefore / 1440)} day(s)`
    : minutesBefore >= 60
    ? `${Math.round(minutesBefore / 60)} hour(s)`
    : `${minutesBefore} minutes`;

  const eventTime = event.eventTime || 'TBD';
  const eventDate = event.eventDate || 'TBD';
  const location = [event.city, event.state].filter(Boolean).join(', ') || 'Not specified';

  const subject = `⏰ Reminder: ${event.eventType} for ${event.clientName} in ${timeLabel}`;

  const html = `
    <div style="font-family: -apple-system, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #FAF8F5; border-radius: 16px;">
      <div style="background: #7B2D52; color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 20px;">✨ MUA Planner</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Event Reminder</p>
      </div>

      <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #E8E4DF;">
        <h2 style="color: #7B2D52; margin: 0 0 16px; font-size: 18px;">
          ⏰ Starting in ${timeLabel}
        </h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #5C5C70; font-weight: 600;">Client</td>
            <td style="padding: 8px 0; color: #1A1A2E; text-align: right;">${event.clientName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #5C5C70; font-weight: 600;">Event</td>
            <td style="padding: 8px 0; color: #1A1A2E; text-align: right;">${event.eventType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #5C5C70; font-weight: 600;">Date</td>
            <td style="padding: 8px 0; color: #1A1A2E; text-align: right;">${eventDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #5C5C70; font-weight: 600;">Time</td>
            <td style="padding: 8px 0; color: #1A1A2E; text-align: right;">${eventTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #5C5C70; font-weight: 600;">Location</td>
            <td style="padding: 8px 0; color: #1A1A2E; text-align: right;">${location}</td>
          </tr>
        </table>

        ${event.notes ? `<p style="margin: 16px 0 0; padding: 12px; background: #F7F5F2; border-radius: 8px; font-size: 13px; color: #5C5C70;">
          <strong>Notes:</strong> ${event.notes}
        </p>` : ''}
      </div>

      <p style="text-align: center; color: #9E9EB0; font-size: 12px; margin-top: 16px;">
        Sent by MUA Planner • Manage reminders in Settings
      </p>
    </div>
  `;

  return { subject, html };
}

/* ═══════════════════════════════════════════════
   NOTIFICATION SCHEDULER
   ═══════════════════════════════════════════════
   Runs every minute. For each verified user:
   1. Reads their notification settings
   2. Finds upcoming events within the reminder window
   3. Calculates reminder times based on notifyBefore & notifyTimes
   4. Sends emails for any unsent reminders
   ═══════════════════════════════════════════════ */

async function runNotificationCheck() {
  try {
    const now = new Date();

    // Get all verified users
    const users = await all('SELECT id, email FROM users WHERE verified = 1');

    // Read global notification settings
    const settingsRows = await all('SELECT key, value FROM settings');
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    const enabled = settings.notificationsEnabled === 'true';
    if (!enabled) return; // notifications disabled globally

    const notifyBeforeMin = parseInt(settings.notifyBefore || '60', 10);
    const notifyTimes = parseInt(settings.notifyTimes || '1', 10);

    // Get all upcoming events with date and time set
    const events = await all(
      `SELECT * FROM events WHERE status = 'upcoming' AND eventDate != '' AND eventTime != ''`
    );

    for (const event of events) {
      // Parse event datetime
      const eventDateTime = parseEventDateTime(event.eventDate, event.eventTime);
      if (!eventDateTime) continue; // invalid date/time
      
      // CRITICAL: Skip if event has already started (even by 1 minute)
      // This prevents sending "24 hours before" reminders after the event started
      if (eventDateTime <= now) {
        continue;
      }

      // Calculate reminder schedule
      // e.g. notifyBefore=60, notifyTimes=3 → reminders at 60min, 30min, 15min before
      const reminderSlots = [];
      for (let i = 0; i < notifyTimes; i++) {
        const minutesBefore = Math.round(notifyBeforeMin / (i + 1));
        if (minutesBefore < 5) break; // don't send reminders less than 5 min before
        reminderSlots.push({ reminderNumber: i + 1, minutesBefore });
      }

      for (const slot of reminderSlots) {
        const reminderTime = new Date(eventDateTime.getTime() - slot.minutesBefore * 60 * 1000);

        // Check if it's time to send (within a 2-minute window since cron runs every minute)
        const diffMs = now - reminderTime;
        
        // Skip if not yet time (reminder is still in future)
        if (diffMs < 0) continue;
        
        // Skip if reminder window passed (more than 5 minutes ago)
        // This prevents sending stale reminders when server restarts or was down
        if (diffMs > 5 * 60 * 1000) continue;

        // Send to each user
        for (const user of users) {
          // Check if already sent for this event + reminder number + user
          const existing = await get(
            `SELECT id FROM notifications
             WHERE eventId = ? AND email = ? AND reminderNumber = ? AND status = 'sent'`,
            event.id, user.email, slot.reminderNumber
          );

          if (existing) continue; // already sent

          // Build and send email
          const { subject, html } = buildReminderEmail(event, slot.minutesBefore);
          const notifId = uuidv4();
          const notifNow = new Date().toISOString();

          // Insert pending notification
          await run(
            `INSERT INTO notifications (id, eventId, email, reminderNumber, scheduledFor, subject, body, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            notifId, event.id, user.email, slot.reminderNumber, reminderTime.toISOString(), subject, 'email', notifNow
          );

          // Send the email
          sendEmail(user.email, subject, html).then(async (result) => {
            if (result.success) {
              await run(
                `UPDATE notifications SET status = 'sent', sentAt = ? WHERE id = ?`,
                new Date().toISOString(), notifId
              );
              console.log(`✅ Reminder #${slot.reminderNumber} sent to ${user.email} for "${event.clientName} — ${event.eventType}"`);
            } else {
              await run(
                `UPDATE notifications SET status = 'failed' WHERE id = ?`,
                notifId
              );
              console.log(`❌ Reminder failed for ${user.email}: ${result.error}`);
            }
          });
        }
      }
    }
  } catch (err) {
    console.error('⚠️  Notification scheduler error:', err.message);
  }
}

/* ─── Parse event date + time into a Date (IST timezone) ──── */
function parseEventDateTime(dateStr, timeStr) {
  try {
    if (!dateStr) return null;

    // Handle various time formats: "10:00", "4:32 AM", "16:00"
    let hours = 0, minutes = 0;
    if (timeStr) {
      const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (ampmMatch) {
        hours = parseInt(ampmMatch[1], 10);
        minutes = parseInt(ampmMatch[2], 10);
        const period = ampmMatch[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
      } else {
        const match24 = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (match24) {
          hours = parseInt(match24[1], 10);
          minutes = parseInt(match24[2], 10);
        }
      }
    }

    // Parse as IST (UTC+5:30) since users are in India
    // Format: YYYY-MM-DDTHH:mm:ss+05:30
    const pad = (n) => String(n).padStart(2, '0');
    const isoString = `${dateStr}T${pad(hours)}:${pad(minutes)}:00+05:30`;
    const d = new Date(isoString);
    
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/* ─── Start the cron scheduler ─────────────── */
function startNotificationScheduler() {
  // Initialize email transport
  initTransport();

  // Run every minute
  cron.schedule('* * * * *', () => {
    runNotificationCheck();
  });

  console.log('🔔 Notification scheduler started (checks every minute)');
}

module.exports = { startNotificationScheduler, sendEmail, runNotificationCheck };
