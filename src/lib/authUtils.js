
/**
 * Authentication validation utility.
 * Updated to always return true as authentication has been disabled.
 * This ensures compatibility with existing components that check for session validity.
 */
export async function validateSession() {
  return true;
}
