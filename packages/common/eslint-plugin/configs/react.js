//
// Copyright 2022 DXOS.org
//

module.exports = {
  extends: [
    'plugin:react/recommended',
    // TODO(burdon): Carefully test before enabling.
    // https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks
    // 'plugin:react-hooks/recommended',
  ],
  rules: {
    'jsx-quotes': ['error', 'prefer-single'],
    'react/display-name': 'off',
    'react/function-component-definition': [
      'error',
      {
        namedComponents: 'arrow-function',
        unnamedComponents: 'arrow-function',
      },
    ],
    'react/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
    'react/jsx-tag-spacing': [
      'error',
      {
        closingSlash: 'never',
        beforeSelfClosing: 'always',
        afterOpening: 'never',
        beforeClosing: 'never',
      },
    ],
    'react/jsx-wrap-multilines': 'off',
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
  },
};
