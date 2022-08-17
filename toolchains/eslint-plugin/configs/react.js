const recomended = require('./recomended');

module.exports = {
  ...recomended,
  extends: [
    ...recomended.extends,
    'plugin:react/recommended'
  ],
  ignorePatterns: [
    ...recomended.ignorePatterns,

    // Build Artifacts
    'out',

    // Config
    'esbuild-server.config.js',
    'webpack.config.js'
  ],
  rules: {
    ...recomended.rules,
    'jsx-quotes': [
      'error',
      'prefer-single'
    ],
    'react/display-name': 'off',
    'react/function-component-definition': ['error', {
      'namedComponents': 'arrow-function',
      'unnamedComponents': 'arrow-function'
    }],
    'react/jsx-first-prop-new-line': [
      'error',
      'multiline-multiprop'
    ],
    'react/jsx-tag-spacing': ['error', {
      'closingSlash': 'never',
      'beforeSelfClosing': 'always',
      'afterOpening': 'never',
      'beforeClosing': 'never'
    }],
    'react/jsx-wrap-multilines': ['error', {
      'declaration': 'parens-new-line',
      'assignment': 'parens-new-line',
      'return': 'parens-new-line',
      'arrow': 'parens-new-line',
      'condition': 'parens-new-line',
      'logical': 'parens-new-line',
      'prop': 'parens-new-line'
    }],
    'react/prop-types': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  env: {
    browser: true
  }
}
