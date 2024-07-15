//
// Copyright 2022 DXOS.org
//

module.exports = {
  extends: ['semistandard'],
  plugins: ['prettier', 'unused-imports', '@stayradiated/prefer-arrow-functions', '@dxos/rules'],
  rules: {
    'no-console': 'error',
    '@dxos/rules/comment': 'off',
    '@dxos/rules/header': 'error',
    '@stayradiated/prefer-arrow-functions/prefer-arrow-functions': [
      'error',
      {
        classPropertiesAllowed: false,
        disallowPrototype: false,
        returnStyle: 'unchanged',
        singleReturnOnly: false,
      },
    ],
    'brace-style': 'off',
    'comma-spacing': 'off',
    'comma-dangle': 'off',
    curly: ['error', 'all'],
    'func-call-spacing': 'off',
    'generator-star-spacing': 'off',
    'import/export': 'off',
    'import/newline-after-import': [
      'error',
      {
        count: 1,
        // TODO(wittjosiah): This option exists but seems unreleased.
        //   https://github.com/import-js/eslint-plugin-import/pull/2399#issuecomment-1103636483
        // considerComments: true
      },
    ],
    'import/order': [
      'error',
      {
        pathGroups: [
          {
            pattern: '@{mui,material-ui}/**',
            group: 'external',
            position: 'after',
          },
          {
            pattern: '@{dxos,braneframe}/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['@{dxos,braneframe}/**', '@{mui,material-ui}/**'],
        'newlines-between': 'always',
        groups: [['builtin', 'external'], 'internal'],
        alphabetize: {
          order: 'asc',
        },
      },
    ],
    indent: 'off',
    'multiline-ternary': 'off',
    'n/no-callback-literal': 'off',
    'node/no-callback-literal': 'off',
    'no-extra-parens': 'off',
    'no-lone-blocks': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: ['**/dist', '**/src/**', '!./**', '!../**'],
      },
    ],
    'no-unused-expressions': 'off',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'no-useless-constructor': 'off',
    'no-void': [
      'error',
      {
        allowAsStatement: true,
      },
    ],
    'padded-blocks': 'off',
    'prettier/prettier': 'error',
    'quote-props': 'off',
    'space-before-function-paren': 'off',
    'standard/no-callback-literal': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'none',
      },
    ],
    'yield-star-spacing': 'off',
    'n/handle-callback-err': 'off',
  },
};
