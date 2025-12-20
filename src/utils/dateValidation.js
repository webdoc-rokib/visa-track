/**
 * Date validation and parsing utilities
 * Provides safe date handling with explicit error messages
 */

/**
 * Validates if a string is in YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {object} { isValid: boolean, error?: string }
 */
export const validateDateFormat = (dateString) => {
  if (!dateString) {
    return { isValid: false, error: 'Date is required' };
  }

  if (typeof dateString !== 'string') {
    return { isValid: false, error: 'Date must be a string' };
  }

  const trimmed = dateString.trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(trimmed)) {
    return { isValid: false, error: 'Date must be in YYYY-MM-DD format' };
  }

  // Validate actual date existence
  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Check if date is valid (constructor coerces invalid dates)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { isValid: false, error: 'Invalid date (does not exist)' };
  }

  return { isValid: true };
};

/**
 * Safely parses YYYY-MM-DD date string to Date object
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Date|null} - Parsed date or null if invalid
 * @throws {Error} if format is invalid
 */
export const parseYYYYMMDD = (dateString) => {
  const validation = validateDateFormat(dateString);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const [year, month, day] = dateString.trim().split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Safely parses YYYY-MM-DD string without throwing errors
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Date|null} - Parsed date or null if invalid
 */
export const parseDateSafe = (dateString) => {
  try {
    return parseYYYYMMDD(dateString);
  } catch (e) {
    console.warn(`Failed to parse date "${dateString}":`, e.message);
    return null;
  }
};

/**
 * Formats Date object to YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatToYYYYMMDD = (date) => {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Validates attendance date format and logs issues
 * @param {string} dateString - Attendance date
 * @param {string} context - Where this date is being used (for logging)
 * @returns {boolean} - Whether date is valid
 */
export const validateAttendanceDate = (dateString, context = 'unknown') => {
  const validation = validateDateFormat(dateString);
  
  if (!validation.isValid) {
    console.error(`[Attendance Date Validation] Invalid date in ${context}: "${dateString}" - ${validation.error}`);
    return false;
  }

  return true;
};

/**
 * Safely compares two date strings
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {number} - -1 if date1 < date2, 0 if equal, 1 if date1 > date2, null if invalid
 */
export const compareDateStrings = (date1, date2) => {
  const d1 = parseDateSafe(date1);
  const d2 = parseDateSafe(date2);

  if (!d1 || !d2) {
    return null;
  }

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};
