module.exports = {
  extends: 'plugin:@dxos/recomended',
  rules: { // TODO(marik-d): Move them to DXOS eslint config
    'import/export': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'none'
      }
    ]
  },
  ignorePatterns: [
    'src/proto/gen/*'
  ]
}
