export default {
  displayName: 'async',
  preset: '../../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }
  },
  coverageDirectory: 'packages/common/async/coverage'
};
