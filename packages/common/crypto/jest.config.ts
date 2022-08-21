/* eslint-disable */
export default {
  displayName: 'crypto',
  preset: '../../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }
  },
  coverageDirectory: 'packages/common/crypto/coverage'
};
