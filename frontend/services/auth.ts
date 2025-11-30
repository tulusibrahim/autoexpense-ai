/**
 * Authentication service - handles logout callbacks for token expiration
 */

type LogoutCallback = () => void;

let logoutCallback: LogoutCallback | null = null;
let isLoggingOut = false;

/**
 * Register a logout callback that will be called when token expires
 */
export const registerLogoutCallback = (callback: LogoutCallback) => {
  logoutCallback = callback;
};

/**
 * Unregister the logout callback
 */
export const unregisterLogoutCallback = () => {
  logoutCallback = null;
  isLoggingOut = false;
};

/**
 * Trigger logout (called by HTTP interceptor when 401 is detected)
 * Prevents multiple simultaneous logout triggers
 */
export const triggerLogout = () => {
  if (isLoggingOut || !logoutCallback) {
    return;
  }

  isLoggingOut = true;

  // Use setTimeout to ensure the logout happens after the current error handling
  setTimeout(() => {
    if (logoutCallback) {
      logoutCallback();
    }
    // Reset flag after a delay to allow for re-login
    setTimeout(() => {
      isLoggingOut = false;
    }, 1000);
  }, 100);
};
