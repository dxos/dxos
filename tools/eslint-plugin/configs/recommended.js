//
// Copyright 2022 DXOS.org
//

module.exports = {
  extends: [
    'semistandard'
  ],
  plugins: [
    'unused-imports',
    '@stayradiated/prefer-arrow-functions',
    '@dxos/rules'
  ],
  rules: {
    '@dxos/rules/comment': 'off',
    '@dxos/rules/header': 'error',
    '@stayradiated/prefer-arrow-functions/prefer-arrow-functions': [
      'error',
      {
        classPropertiesAllowed: false,
        disallowPrototype: false,
        returnStyle: 'unchanged',
        singleReturnOnly: false
      }
    ],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    'func-call-spacing': 'off',
    'import/export': 'off',
    'import/order': ['error', {
      pathGroups: [
        {
          pattern: '@{mui,material-ui}/**',
          group: 'external',
          position: 'after'
        },
        {
          pattern: '@{dxos,braneframe}/**',
          group: 'internal',
          position: 'before'
        }
      ],
      pathGroupsExcludedImportTypes: [
        '@{dxos,braneframe}/**',
        '@{mui,material-ui}/**'
      ],
      'newlines-between': 'always',
      groups: [
        ['builtin', 'external'],
        'internal'
      ],
      alphabetize: {
        order: 'asc'
      }
    }],
    'multiline-ternary': 'off',
    'n/no-callback-literal': 'off',
    'node/no-callback-literal': 'off',
    'no-extra-parens': 'off',
    'no-lone-blocks': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '**/dist',
          '**/src/**',
          '!./**',
          '!../**'
        ]
      }
    ],
    'no-unused-expressions': 'off',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'no-useless-constructor': 'off',
    'no-void': [
      'error',
      {
        allowAsStatement: true
      }
    ],
    'padded-blocks': 'off',
    'quote-props': 'off',
    'standard/no-callback-literal': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        'vars': 'all',
        'varsIgnorePattern': '^_',
        'args': 'none'
      }
    ]
  }
};
