const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    include: [
      'tests/unit/**/*.test.js'
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'test-results/vitest-junit.xml'
    },
    testTimeout: 15000
  }
});
