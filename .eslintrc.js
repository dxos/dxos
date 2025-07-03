//
// Copyright 2022 DXOS.org
//

// TODO(burdon): Migrate to eslint.config.js config format.

require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,

  ignorePatterns: [
    // Build Artifacts
    'dist',
    'out',
    '**/proto/gen/*',
    'packages/core/protocols/proto/**/*',
    'packages/sdk/client/src/version.ts',
    'packages/sdk/client-services/src/version.ts',

    // Config
    '.eslintrc.js',
    '.mocharc.js',
    'esbuild-server.config.js',
    'webpack.config.js',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.shared.ts',
    'playwright.config.cts',

    // Dependencies
    'node_modules',

    // Templates
    // TODO(wittjosiah): Fix lint config to lint these files.
    '*.t.ts',

    // Docs snippets
    'docs/content/**/*',
    '**/typedoc/assets/**/*',
  ],

  overrides: [
    {
      extends: ['plugin:@dxos/recommended'],
      files: '**/*.{ts,mts,tsx,js,jsx}',
      rules: {
        camelcase: 'off',
      },
    },
    {
      extends: ['plugin:@dxos/typescript'],
      files: '**/*.{ts,mts,tsx}',
    },
    {
      extends: ['plugin:@dxos/react'],
      files: '**/*.{tsx,jsx}',
    },
    {
      extends: ['plugin:@dxos/test'],
      files: '**/*.test.{ts,tsx,js,jsx}',
    },
    {
      files: '**/*.{test,stories,blueprint-test}.{ts,tsx,js,jsx}',
      rules: {
        'no-console': 'off',
      },
    },
  ],

  extends: ['plugin:storybook/recommended']
};
