/* eslint-disable */
const nxPreset = require('@nrwl/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironment: 'node',
  modulePathIgnorePatterns: [
    'test/gen',
    'dist'
  ]
};
