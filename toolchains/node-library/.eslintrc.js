module.exports = {
  extends: 'plugin:@dxos/recomended',
  rules: { // TODO(marik-d): Move them to DXOS eslint config
    'import/export': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'standard/no-callback-literal': 'off',
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
