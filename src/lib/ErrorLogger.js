const listeners = new Set();
let errors = [];

export const logError = (message, errorType = 'GENERAL', details = null) => {
  const errorEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message,
    type: errorType,
    details: details instanceof Error ? details.message : JSON.stringify(details)
  };

  errors.unshift(errorEntry);
  
  // Keep only last 100 errors
  if (errors.length > 100) {
    errors = errors.slice(0, 100);
  }

  notifyListeners();
  console.error(`[${errorType}] ${message}`, details);
};

export const getErrors = () => {
  return errors;
};

export const clearErrors = () => {
  errors = [];
  notifyListeners();
};

export const subscribeToErrors = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = () => {
  listeners.forEach(listener => listener(errors));
};

export default {
  logError,
  getErrors,
  clearErrors,
  subscribeToErrors
};