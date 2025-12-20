/**
 * Input Sanitization & Validation
 * Prevents XSS and injection attacks
 */

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text safe to display
 */
export const escapeHTML = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'\/]/g, (char) => escapeMap[char]);
};

/**
 * Sanitizes user input by trimming and escaping
 * @param {string} input - Raw user input
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input, options = {}) => {
  const {
    maxLength = 500,
    allowHTML = false,
    toLowerCase = false,
    trim = true
  } = options;

  if (!input || typeof input !== 'string') return '';

  let sanitized = input;

  // Trim whitespace if requested
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Limit length to prevent storage attacks
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML unless explicitly allowed
  if (!allowHTML) {
    sanitized = escapeHTML(sanitized);
  }

  // Convert to lowercase if requested
  if (toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }

  return sanitized;
};

/**
 * Validates and sanitizes applicant name
 * @param {string} name - Applicant name
 * @returns {object} { isValid: boolean, value: string, error?: string }
 */
export const validateApplicantName = (name) => {
  const sanitized = sanitizeInput(name, { maxLength: 100 });

  if (!sanitized || sanitized.length < 2) {
    return { isValid: false, value: '', error: 'Name must be at least 2 characters' };
  }

  // Allow letters, spaces, hyphens, and apostrophes only
  if (!/^[a-zA-Z\s'-]+$/.test(sanitized)) {
    return { isValid: false, value: sanitized, error: 'Name contains invalid characters' };
  }

  return { isValid: true, value: sanitized };
};

/**
 * Validates and sanitizes contact number
 * @param {string} phone - Phone number
 * @returns {object} { isValid: boolean, value: string, error?: string }
 */
export const validateContactNumber = (phone) => {
  const sanitized = sanitizeInput(phone, { maxLength: 20 }).replace(/\s+/g, '');

  if (!sanitized || sanitized.length < 7) {
    return { isValid: false, value: '', error: 'Phone must be at least 7 digits' };
  }

  // Allow only digits, +, -, and parentheses
  if (!/^[\d+\-()]+$/.test(sanitized)) {
    return { isValid: false, value: sanitized, error: 'Phone contains invalid characters' };
  }

  return { isValid: true, value: sanitized };
};

/**
 * Validates and sanitizes note/comment
 * @param {string} note - Note text
 * @returns {object} { isValid: boolean, value: string, error?: string }
 */
export const validateNote = (note) => {
  const sanitized = sanitizeInput(note, { maxLength: 1000 });

  if (!sanitized || sanitized.length < 1) {
    return { isValid: false, value: '', error: 'Note cannot be empty' };
  }

  return { isValid: true, value: sanitized };
};

/**
 * Validates and sanitizes passport number
 * @param {string} passport - Passport number
 * @returns {object} { isValid: boolean, value: string, error?: string }
 */
export const validatePassportNumber = (passport) => {
  const sanitized = sanitizeInput(passport, { maxLength: 30 }).toUpperCase();

  if (!sanitized || sanitized.length < 5) {
    return { isValid: false, value: '', error: 'Passport must be at least 5 characters' };
  }

  // Allow alphanumeric characters only
  if (!/^[A-Z0-9]+$/.test(sanitized)) {
    return { isValid: false, value: sanitized, error: 'Passport contains invalid characters' };
  }

  return { isValid: true, value: sanitized };
};

/**
 * Validates and sanitizes numeric input
 * @param {string|number} value - Numeric value
 * @returns {object} { isValid: boolean, value: number, error?: string }
 */
export const validateNumericInput = (value, options = {}) => {
  const { min = 0, max = Infinity, allowDecimal = true } = options;

  const num = parseFloat(value);

  if (isNaN(num)) {
    return { isValid: false, value: 0, error: 'Invalid number' };
  }

  if (num < min) {
    return { isValid: false, value: min, error: `Value must be at least ${min}` };
  }

  if (num > max) {
    return { isValid: false, value: max, error: `Value must not exceed ${max}` };
  }

  if (!allowDecimal && num % 1 !== 0) {
    return { isValid: false, value: Math.round(num), error: 'Decimal values not allowed' };
  }

  return { isValid: true, value: num };
};

/**
 * Creates a safe display version of text (escaped for HTML rendering)
 * @param {string} text - Text to display
 * @returns {string} - Safe text for display
 */
export const sanitizeForDisplay = (text) => {
  return sanitizeInput(text, { allowHTML: false, trim: true });
};

/**
 * Validates all file creation data
 * @param {object} fileData - Raw file data from form
 * @returns {object} - { isValid: boolean, errors: object, data: object }
 */
export const validateFileData = (fileData) => {
  const errors = {};
  const data = {};

  // Validate applicant name
  const nameVal = validateApplicantName(fileData.applicantName);
  if (!nameVal.isValid) errors.applicantName = nameVal.error;
  else data.applicantName = nameVal.value;

  // Validate contact
  const contactVal = validateContactNumber(fileData.contactNo);
  if (!contactVal.isValid) errors.contactNo = contactVal.error;
  else data.contactNo = contactVal.value;

  // Validate passport if visa
  if (fileData.fileType === 'Visa') {
    const passportVal = validatePassportNumber(fileData.passportNo);
    if (!passportVal.isValid) errors.passportNo = passportVal.error;
    else data.passportNo = passportVal.value;
  }

  // Validate numeric fields
  if (fileData.serviceCharge !== undefined) {
    const chargeVal = validateNumericInput(fileData.serviceCharge, { min: 0 });
    if (!chargeVal.isValid) errors.serviceCharge = chargeVal.error;
    else data.serviceCharge = chargeVal.value;
  }

  if (fileData.cost !== undefined) {
    const costVal = validateNumericInput(fileData.cost, { min: 0 });
    if (!costVal.isValid) errors.cost = costVal.error;
    else data.cost = costVal.value;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data
  };
};
