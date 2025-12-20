/**
 * Secure Session Management
 * Handles user session without exposing sensitive data
 */

/**
 * Stores only non-sensitive user data in localStorage
 * NEVER store passwords or sensitive tokens here
 * @param {object} user - User object from Firestore
 */
export const storeSecureUserSession = (user) => {
  if (!user) {
    localStorage.removeItem('visaTrackUser');
    return;
  }

  // Only store non-sensitive user data
  const safeUserData = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    // DO NOT STORE: password, email, phone, address, etc.
  };

  localStorage.setItem('visaTrackUser', JSON.stringify(safeUserData));
};

/**
 * Retrieves user session from localStorage
 * @returns {object|null} - User object or null if not logged in
 */
export const getSecureUserSession = () => {
  const stored = localStorage.getItem('visaTrackUser');
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse user session:', e);
    clearUserSession();
    return null;
  }
};

/**
 * Clears user session from localStorage
 */
export const clearUserSession = () => {
  localStorage.removeItem('visaTrackUser');
};

/**
 * Validates that session data has required fields
 * @param {object} user - User object to validate
 * @returns {boolean} - Whether user session is valid
 */
export const isValidUserSession = (user) => {
  return user && 
         typeof user.id === 'string' && 
         typeof user.name === 'string' && 
         typeof user.role === 'string' &&
         user.id.length > 0 &&
         user.name.length > 0;
};

/**
 * SECURITY WARNING: Password validation should happen on Firebase Cloud Functions,
 * not in the browser. This function should only be called during initial authentication.
 * After successful auth, never transmit passwords again.
 * 
 * @param {string} inputPassword - Password to validate
 * @param {string} storedPassword - Password from Firestore (SHOULD NOT BE USED - for demo only)
 * @returns {boolean} - Whether passwords match
 * @deprecated Use Firebase Authentication instead
 */
export const validatePassword = (inputPassword, storedPassword) => {
  console.warn('⚠️ SECURITY: Password comparison happening in browser. For production, use Firebase Cloud Functions with hashed passwords.');
  
  if (!inputPassword || !storedPassword) {
    return false;
  }

  // Simple string comparison (INSECURE - for demo only)
  // In production, use bcrypt or scrypt on Cloud Functions
  return inputPassword.trim() === storedPassword.trim();
};

/**
 * Logs the user out and clears all session data
 */
export const logoutUser = () => {
  clearUserSession();
  localStorage.removeItem('currentAttendanceId');
  // Optionally clear other sensitive data
  sessionStorage.clear();
};
