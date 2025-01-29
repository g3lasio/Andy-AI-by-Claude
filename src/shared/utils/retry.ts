export function retry(fn: Function, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
