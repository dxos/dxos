module.exports = {
  extends: [
    'plugin:@dxos/jest',
    'plugin:@dxos/recomended'
  ],
  rules: { // TODO(marik-d): Move them to DXOS eslint config
    'import/export': 'off',
    'no-extra-parens': 'off',
    '@typescript-eslint/no-extra-parens': ['off'],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'standard/no-callback-literal': 'off',
    'jest/no-conditional-expect': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'none'
      }
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: ['**/dist']
      }
    ],
    'node/no-callback-literal': 'off',
    'jest/valid-expect': 'off'
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
