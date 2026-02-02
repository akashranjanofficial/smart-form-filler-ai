/**
 * Jest Configuration for JobFiller Tests
 */
module.exports = {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/ai-brain-server/'  // Brain server has its own jest config
    ],
    testTimeout: 60000, // 60 seconds for E2E tests
    verbose: true,
    // Only use setup for e2e tests
    projects: [
        {
            displayName: 'unit',
            testEnvironment: 'node',
            testMatch: [
                '**/tests/service-worker.test.js',
                '**/tests/content.test.js'
            ]
        },
        {
            displayName: 'e2e',
            testEnvironment: 'node',
            testMatch: ['**/tests/e2e/**/*.test.js'],
            setupFilesAfterEnv: ['./tests/e2e/setup.js']
        }
    ]
};
