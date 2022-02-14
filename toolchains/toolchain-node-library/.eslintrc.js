module.exports = {
  extends: [
    'plugin:@dxos/jest',
    'plugin:@dxos/recomended'
  ],
  rules: {
  
  },
  ignorePatterns: [
    'src/proto/gen/*'
  ],
  overrides: [
    {
      files: [
        "**/*.test.ts",
        "**/*.int-test.ts"
      ],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        "no-unused-expressions": "off",
        "no-use-before-define": "off",
        "jest/valid-expect": "off"
      }
    }
  ]
}
