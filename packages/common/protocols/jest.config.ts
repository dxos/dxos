export default {
  displayName: 'protocols',
  preset: '../../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }
  },
  coverageDirectory: 'packages/common/protocols/coverage'
};
