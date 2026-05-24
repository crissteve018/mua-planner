const { body, param, query, validationResult } = require('express-validator');

// ── Handle validation errors ────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Sanitizers ──────────────────────────────────
const sanitizeString = (field) => body(field).optional().trim().escape();
const sanitizeEmail = (field) => body(field).optional().isEmail().normalizeEmail();
const sanitizeInt = (field) => body(field).optional().toInt();
const sanitizeFloat = (field) => body(field).optional().toFloat();
const sanitizeBool = (field) => body(field).optional().toBoolean();

// ── Common validators ───────────────────────────
const isUUID = (field, location = 'param') => {
  const validator = location === 'param' ? param(field) : body(field);
  return validator.isUUID().withMessage(`${field} must be a valid UUID`);
};

const isEmail = (field) => body(field)
  .isEmail().withMessage('Invalid email format')
  .normalizeEmail();

const isPhoneOptional = (field) => body(field)
  .optional()
  .trim()
  .matches(/^[\d\s\-+()]*$/).withMessage('Invalid phone number format');

const isDateOptional = (field) => body(field)
  .optional()
  .trim()
  .matches(/^\d{4}-\d{2}-\d{2}$|^$/).withMessage('Date must be YYYY-MM-DD format');

const isTimeOptional = (field) => body(field)
  .optional()
  .trim();

const isAmountOptional = (field) => body(field)
  .optional()
  .isFloat({ min: 0 }).withMessage(`${field} must be a positive number`)
  .toFloat();

// ══════════════════════════════════════════════════
// ROUTE VALIDATORS
// ══════════════════════════════════════════════════

// ── Events ──────────────────────────────────────
const validateCreateEvent = [
  body('clientName')
    .notEmpty().withMessage('Client name is required')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Client name must be 1-200 characters'),
  body('eventType')
    .notEmpty().withMessage('Event type is required')
    .trim()
    .isLength({ max: 100 }),
  sanitizeString('clientPhone'),
  sanitizeString('alternativePhone'),
  sanitizeEmail('emailAddress'),
  sanitizeString('country'),
  sanitizeString('state'),
  sanitizeString('city'),
  sanitizeString('buildingName'),
  sanitizeString('address'),
  sanitizeString('notes'),
  isDateOptional('eventDate'),
  isTimeOptional('eventTime'),
  isAmountOptional('packageAmount'),
  isAmountOptional('advancePaid'),
  sanitizeBool('workLocationDifferent'),
  sanitizeBool('touchupRequired'),
  sanitizeBool('extraSareeDrapes'),
  sanitizeBool('waitingRequired'),
  sanitizeBool('extraMakeup'),
  sanitizeBool('extraHairdo'),
  handleValidation,
];

const validateUpdateEvent = [
  isUUID('id'),
  body('clientName').optional().trim().isLength({ min: 1, max: 200 }),
  body('eventType').optional().trim().isLength({ max: 100 }),
  sanitizeString('clientPhone'),
  sanitizeString('alternativePhone'),
  sanitizeEmail('emailAddress'),
  isDateOptional('eventDate'),
  isTimeOptional('eventTime'),
  isAmountOptional('packageAmount'),
  isAmountOptional('advancePaid'),
  handleValidation,
];

const validateEventId = [
  isUUID('id'),
  handleValidation,
];

const validateCancelEvent = [
  isUUID('id'),
  body('cancelReason').optional().trim().isLength({ max: 500 }),
  body('moneyOption').optional().trim().isIn(['refund', 'credit', 'partial', '']),
  isAmountOptional('moneyAmount'),
  handleValidation,
];

// ── Travel ──────────────────────────────────────
const validateCreateTravel = [
  isUUID('eventId', 'body'),
  body('travelMode')
    .notEmpty().withMessage('Travel mode is required')
    .isIn(['flight', 'train', 'cab', 'own_car', 'bus']).withMessage('Invalid travel mode'),
  isDateOptional('travelDate'),
  isDateOptional('returnDate'),
  isAmountOptional('totalCost'),
  sanitizeString('notes'),
  sanitizeString('departureCity'),
  sanitizeString('arrivalCity'),
  sanitizeString('airlineName'),
  sanitizeString('trainNumber'),
  sanitizeString('trainName'),
  sanitizeString('departureStation'),
  sanitizeString('arrivalStation'),
  sanitizeString('cabProvider'),
  sanitizeString('pickupLocation'),
  sanitizeString('dropLocation'),
  sanitizeString('driverContact'),
  sanitizeString('startingLocation'),
  sanitizeString('destination'),
  sanitizeString('busOperator'),
  sanitizeString('departureLocation'),
  sanitizeString('arrivalLocation'),
  handleValidation,
];

const validateUpdateTravel = [
  isUUID('id'),
  body('travelMode').optional().isIn(['flight', 'train', 'cab', 'own_car', 'bus']),
  isDateOptional('travelDate'),
  isDateOptional('returnDate'),
  isAmountOptional('totalCost'),
  handleValidation,
];

const validateTravelId = [
  isUUID('id'),
  handleValidation,
];

// ── Team Contacts ───────────────────────────────
const validateCreateTeamContact = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Name must be 1-200 characters'),
  body('defaultRole')
    .notEmpty().withMessage('Role is required')
    .trim()
    .isLength({ max: 50 }),
  isPhoneOptional('phone'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Invalid email format'),
  handleValidation,
];

const validateUpdateTeamContact = [
  isUUID('id'),
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('defaultRole').optional().trim().isLength({ max: 50 }),
  isPhoneOptional('phone'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Invalid email format'),
  handleValidation,
];

const validateTeamContactId = [
  isUUID('id'),
  handleValidation,
];

// ── Team Members (per event) ────────────────────
const validateCreateTeamMember = [
  isUUID('eventId', 'body'),
  body('memberName')
    .notEmpty().withMessage('Member name is required')
    .trim()
    .isLength({ min: 1, max: 200 }),
  body('teamRole')
    .notEmpty().withMessage('Team role is required')
    .trim()
    .isLength({ max: 50 }),
  isAmountOptional('amount'),
  isAmountOptional('amountPaid'),
  body('paymentStatus').optional().isIn(['pending', 'partial', 'paid', '']),
  handleValidation,
];

const validateUpdateTeamMember = [
  isUUID('id'),
  body('memberName').optional().trim().isLength({ min: 1, max: 200 }),
  body('teamRole').optional().trim().isLength({ max: 50 }),
  isAmountOptional('amount'),
  isAmountOptional('amountPaid'),
  body('paymentStatus').optional().isIn(['pending', 'partial', 'paid', '']),
  handleValidation,
];

const validateTeamMemberId = [
  isUUID('id'),
  handleValidation,
];

// ── Auth ────────────────────────────────────────
const validateSignup = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  handleValidation,
];

const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  handleValidation,
];

const validateVerifyOTP = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('code')
    .notEmpty().withMessage('OTP code is required')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
  handleValidation,
];

const validateResendOTP = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('purpose').optional().isIn(['verify', 'login']),
  handleValidation,
];

const validateUpdateProfile = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('profileImage').optional().trim(),
  handleValidation,
];

// ── Settings ────────────────────────────────────
const validateUpdateSettings = [
  body('notificationsEnabled').optional().isBoolean(),
  body('notifyBefore').optional().isIn(['60', '240', '480', '1440', '2880']).withMessage('Invalid remind before value'),
  body('theme').optional().isIn(['light', 'dark', 'system']),
  handleValidation,
];

// ── Feedback ────────────────────────────────────
const validateFeedback = [
  body('message')
    .notEmpty().withMessage('Feedback message is required')
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('Feedback must be 1-2000 characters'),
  body('email').optional().isEmail().normalizeEmail(),
  body('type').optional().isIn(['bug', 'feature', 'general', '']),
  handleValidation,
];

// ── Query validators ────────────────────────────
const validateEventQuery = [
  query('status').optional().isIn(['all', 'upcoming', 'completed', 'cancelled']),
  query('search').optional().trim().isLength({ max: 200 }),
  handleValidation,
];

const validateTravelQuery = [
  query('eventStatus').optional().isIn(['all', 'upcoming', 'completed', 'cancelled']),
  handleValidation,
];

module.exports = {
  handleValidation,
  // Events
  validateCreateEvent,
  validateUpdateEvent,
  validateEventId,
  validateCancelEvent,
  validateEventQuery,
  // Travel
  validateCreateTravel,
  validateUpdateTravel,
  validateTravelId,
  validateTravelQuery,
  // Team Contacts
  validateCreateTeamContact,
  validateUpdateTeamContact,
  validateTeamContactId,
  // Team Members
  validateCreateTeamMember,
  validateUpdateTeamMember,
  validateTeamMemberId,
  // Auth
  validateSignup,
  validateLogin,
  validateVerifyOTP,
  validateResendOTP,
  validateUpdateProfile,
  // Settings
  validateUpdateSettings,
  // Feedback
  validateFeedback,
};
