/**
 * Mock Page Helper for Tests
 *
 * Provides a mock Playwright page object that tracks method calls
 * for verification in tests.
 */

/**
 * Create a mock page object that tracks method calls
 * @returns {object} Mock page object with call tracking
 */
function createMockPage() {
  const calls = [];

  return {
    calls,
    goto: async (url) => {
      calls.push({ method: 'goto', args: [url] });
    },
    waitForLoadState: async (state) => {
      calls.push({ method: 'waitForLoadState', args: [state] });
    },
    fill: async (selector, value) => {
      calls.push({ method: 'fill', args: [selector, value] });
    },
    click: async (selector) => {
      calls.push({ method: 'click', args: [selector] });
    },
    press: async (selector, key) => {
      calls.push({ method: 'press', args: [selector, key] });
    },
    waitForSelector: async (selector, options) => {
      calls.push({ method: 'waitForSelector', args: [selector, options] });
    },
    $$: async (selector) => {
      calls.push({ method: '$$', args: [selector] });
      return [];
    }
  };
}

module.exports = { createMockPage };
