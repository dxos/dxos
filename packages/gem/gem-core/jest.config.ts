/* eslint-disable */
export default {
  displayName: "gem-core",
  preset: "./jest.preset.js",
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.spec.json",
    },
  },
  coverageDirectory: "./coverage",
  moduleNameMapper: {
    d3: "<rootDir>/node_modules/d3/dist/d3.min.js"
  }
};
