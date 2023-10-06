// eslint-disable-next-line
const { defaults } = require('jest-config')

/** @type {import('jest').Config} */

module.exports = {
  ...defaults,
  rootDir: process.cwd(),
  moduleDirectories: [...defaults.moduleDirectories, 'dist/node_modules'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^scheduler$': '<rootDir>/node_modules/scheduler/unstable_mock.js',
  },
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: true,
  },
  setupFilesAfterEnv: ['./scripts/jest/setupJest.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
}
