/**
 * Timezone utilities for Dhaka (Asia/Dhaka = UTC+6)
 * Correctly handles date/time conversions without double-counting offsets
 */

/**
 * Gets current time in Dhaka timezone (UTC+6)
 * IMPORTANT: This corrects the old formula which was adding both UTC offset AND local offset
 * 
 * @returns {Date} - Current time in Dhaka timezone
 */
export const getDhakaDate = () => {
  // Create date in UTC first
  const utcNow = new Date();
  
  // Dhaka is UTC+6, so add 6 hours to UTC
  const dhakaTime = new Date(utcNow.getTime() + (6 * 60 * 60 * 1000));
  
  return dhakaTime;
};

/**
 * Gets today's date in Dhaka timezone as YYYY-MM-DD string
 * @returns {string} - Today's date in Dhaka timezone
 */
export const getDhakaTodayString = () => {
  const now = getDhakaDate();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Gets date at start of day in Dhaka timezone
 * @returns {Date} - Start of today (00:00:00) in Dhaka timezone
 */
export const getDhakaMidnight = () => {
  const now = getDhakaDate();
  const midnight = new Date(now);
  midnight.setUTCHours(0, 0, 0, 0);
  return midnight;
};

/**
 * Gets date at end of day in Dhaka timezone
 * @returns {Date} - End of today (23:59:59) in Dhaka timezone
 */
export const getDhakaMidnightNext = () => {
  const now = getDhakaDate();
  const next = new Date(now);
  next.setUTCHours(23, 59, 59, 999);
  return next;
};

/**
 * Converts Firebase timestamp to Dhaka timezone
 * @param {object} timestamp - Firebase timestamp object
 * @returns {Date|null} - Converted date or null if invalid
 */
export const toDhakaTime = (timestamp) => {
  if (!timestamp) return null;
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date((timestamp.seconds || 0) * 1000);
  if (isNaN(date.getTime())) return null;
  
  // Convert from UTC to Dhaka (UTC+6)
  const dhakaTime = new Date(date.getTime() + (6 * 60 * 60 * 1000));
  return dhakaTime;
};

/**
 * Gets start of period in Dhaka timezone
 * @param {string} period - 'today', 'week', 'month', 'alltime', or 'custom'
 * @param {Date} customStartDate - Custom start date if period is 'custom'
 * @returns {Date} - Start of period (midnight Dhaka time)
 */
export const getStartOf = (period, customStartDate = null) => {
  if (!period) period = 'today';
  
  const now = getDhakaDate();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  
  if (period === 'custom') {
    if (!customStartDate) {
      console.warn('Custom period selected but no start date provided, defaulting to today');
      return start;
    }
    const customStart = new Date(customStartDate);
    customStart.setUTCHours(0, 0, 0, 0);
    return customStart;
  }
  
  if (period === 'week') {
    const dayOfWeek = start.getUTCDay();
    // Monday = 1, so subtract (dayOfWeek - 1) days to get to Monday
    // If Sunday (0), go back 6 days; otherwise go back (day-1) days
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setUTCDate(start.getUTCDate() - daysToSubtract);
  } else if (period === 'month') {
    start.setUTCDate(1);
  } else if (period === 'alltime') {
    return new Date(0);
  }
  // else period === 'today', which is already set
  
  return start;
};

/**
 * Gets end of period in Dhaka timezone
 * @param {string} period - 'today', 'week', 'month', 'alltime', or 'custom'
 * @param {Date} customEndDate - Custom end date if period is 'custom'
 * @returns {Date} - End of period (23:59:59 Dhaka time)
 */
export const getEndOf = (period, customEndDate = null) => {
  if (!period) period = 'today';
  
  const now = getDhakaDate();
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);
  
  if (period === 'custom') {
    if (!customEndDate) {
      console.warn('Custom period selected but no end date provided, defaulting to today');
      return end;
    }
    const customEnd = new Date(customEndDate);
    customEnd.setUTCHours(23, 59, 59, 999);
    return customEnd;
  }
  
  if (period === 'week') {
    const dayOfWeek = end.getUTCDay();
    // Get to Sunday (end of week)
    const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    end.setUTCDate(end.getUTCDate() + daysToAdd);
  } else if (period === 'month') {
    // Get last day of current month
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
  } else if (period === 'alltime') {
    // Far future date
    end.setUTCFullYear(2099);
    end.setUTCMonth(11);
    end.setUTCDate(31);
  }
  // else period === 'today', which is already set
  
  return end;
};

/**
 * Creates date key string (YYYY-MM-DD) for a date in Dhaka timezone
 * @param {Date} date - Date to convert
 * @returns {string} - Date key in YYYY-MM-DD format
 */
export const getDateKey = (date) => {
  if (!date || !(date instanceof Date)) return '';
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Gets date from date key string
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Date|null} - Date at midnight Dhaka time, or null if invalid
 */
export const dateFromKey = (dateKey) => {
  if (!dateKey || typeof dateKey !== 'string') return null;
  
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  
  const date = new Date();
  date.setUTCFullYear(year);
  date.setUTCMonth(month - 1);
  date.setUTCDate(day);
  date.setUTCHours(0, 0, 0, 0);
  
  return date;
};

/**
 * Checks if a date is today in Dhaka timezone
 * @param {Date} date - Date to check
 * @returns {boolean} - True if date is today
 */
export const isToday = (date) => {
  if (!date || !(date instanceof Date)) return false;
  
  const today = getDhakaDate();
  return getDateKey(date) === getDateKey(today);
};

/**
 * Checks if a date is in the past (before today) in Dhaka timezone
 * @param {Date} date - Date to check
 * @returns {boolean} - True if date is in the past
 */
export const isPast = (date) => {
  if (!date || !(date instanceof Date)) return false;
  
  const today = getDhakaMidnight();
  return date < today;
};

/**
 * Checks if a date is in the future (after today) in Dhaka timezone
 * @param {Date} date - Date to check
 * @returns {boolean} - True if date is in the future
 */
export const isFuture = (date) => {
  if (!date || !(date instanceof Date)) return false;
  
  const tomorrow = new Date(getDhakaMidnight());
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  
  return date >= tomorrow;
};
