//
// Copyright 2022 DXOS.org
//

// TOOD(burdon): Configure eslint-plugin-simple-import-sort

module.exports = {
  extends: ['semistandard'],
  plugins: [
    // prettier-ignore
    '@dxos/rules',
    '@stayradiated/prefer-arrow-functions',
    'prettier',
    // 'simple-import-sort',
    'unused-imports',
  ],
  rules: {
    '@dxos/rules/comment': 'off',
    '@dxos/rules/header': 'error',
    '@dxos/rules/no-empty-promise-catch': 'error',
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
      },
    ],
    // TODO(burdon): Cycles.
    //  https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md
    // 'import/no-cycle': 1,
    'import/no-self-import': 2,
    // TODO(burdon): Change to: https://github.com/lydell/eslint-plugin-simple-import-sort
    'import/order': [
      'error',
      {
        pathGroups: [
          {
            pattern: '@{dxos,braneframe}/**',
            group: 'internal',
            position: 'before',
          },
        ],
        'newlines-between': 'always',
        pathGroupsExcludedImportTypes: ['@{dxos,braneframe}/**'],
        groups: [['builtin', 'external'], 'internal'],
        alphabetize: {
          order: 'asc',
        },
      },
    ],
    indent: 'off',
    'mocha/handle-done-callback': 'off',
    'multiline-ternary': 'off',
    'n/handle-callback-err': 'off',
    'n/no-callback-literal': 'off',
    'node/no-callback-literal': 'off',
    'no-console': 'error',
    'no-extra-parens': 'off',
    'no-labels': 'off',
    'no-lone-blocks': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: ['**/dist', '**/src', '**/src/**', '!./**', '!../**'],
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
  },
};
