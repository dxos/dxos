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
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
        ecmaVersion: 2023,
        extraFileExtensions: ['.ts', '.tsx'],
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
      },
      rules: {
        camelcase: 'off',
        '@typescript-eslint/no-unused-imports': ['error', {
          ignoreExports: true,
          unusedIgnoreConfig: {
            vars: ['ignore'],
            varsIgnorePattern: '^_',
            args: ['ignore'],
            argsIgnorePattern: '^_',
          },
        }],
        '@typescript-eslint/no-unused-vars': ['error', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        }],
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

  extends: ['plugin:storybook/recommended'],
};
