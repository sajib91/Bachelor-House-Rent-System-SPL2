module.exports = {
  testEnvironment: 'node', // Specifies the environment for testing Node.js applications
  testMatch: ['**/__tests__/**/*.test.js?(x)', '**/?(*.)+(spec|test).js?(x)'], // Pattern for finding test files
  setupFilesAfterEnv: ['./jest.setup.js'], // Files to run before each test suite (for global setup/teardown)
  testTimeout: 30000,
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/config/', // Often config files don't need unit testing in this way
    '/utils/emailService.js', // Email service is hard to unit test without extensive mocking or integration test
  ],
  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['json', 'text', 'lcov', 'clover', 'html'],
};
// ```