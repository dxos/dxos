//
// Copyright 2022 DXOS.org
//

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  extends: [
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: [
    '@typescript-eslint/eslint-plugin'
  ],
  rules: {
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/func-call-spacing': ['error'],
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'none'
        },
        singleline: {
          delimiter: 'comma'
        }
      }
    ],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-extra-parens': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-useless-constructor': ['error']
  }
};
