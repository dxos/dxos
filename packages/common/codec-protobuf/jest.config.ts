export default {
  displayName: 'codec-protobuf',
  preset: '../../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }
  },
  coverageDirectory: 'packages/common/codec-protobuf/coverage'
};
