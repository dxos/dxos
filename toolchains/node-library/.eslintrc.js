module.exports = {
  extends: 'plugin:@dxos/recomended',
  rules: { // TODO(marik-d): Move them to DXOS eslint config
    'import/export': 'off',
    'no-extra-parens': 'off',
    '@typescript-eslint/no-extra-parens': [
      'error',
      'all',
      {
        nestedBinaryExpressions: false
      }
    ],
    '@typescript-eslint/no-namespace': 'off',
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
    ]
  },
  ignorePatterns: [
    'src/proto/gen/*'
  ]
}
