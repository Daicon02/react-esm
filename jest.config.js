// eslint-disable-next-line
const { defaults } = require('jest-config')

/** @type {import('jest').Config} */
const config = {
  ...defaults,
  rootDir: process.cwd(),
  testMatch: ['**/__test__/**/*.{js,jsx,ts,tsx}'],
  moduleDirectories: ['dist/node_modules', ...defaults.moduleDirectories],
  testEnvironment: 'jsdom',
}

module.exports = config
