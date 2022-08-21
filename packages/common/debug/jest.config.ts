/* eslint-disable */
export default {
  displayName: 'debug',
  preset: '../../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }
  },
  coverageDirectory: 'packages/common/debug/coverage'
};
