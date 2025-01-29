
import '@testing-library/jest-dom';

// Mock global.fetch
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Add custom matchers if needed
expect.extend({
  toBeValidResponse(received) {
    const pass = received && typeof received === 'object';
    return {
      pass,
      message: () => `expected ${received} to be a valid response object`,
    };
  },
});
