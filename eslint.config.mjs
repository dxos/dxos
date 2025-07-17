// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import storybook from 'eslint-plugin-storybook';
import dxos from '@dxos/eslint-plugin-rules';
import arrowFunctions from 'eslint-plugin-prefer-arrow-functions';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  //
  // Global ignores
  //
  {
    ignores: [
      // Build Artifacts
      '**/dist',
      '**/out',
      '**/gen/*',
      'packages/core/protocols/proto/**/*',
      'packages/sdk/client/src/version.ts',
      'packages/sdk/client-services/src/version.ts',

      // Config
      '**/eslint.config.mjs',
      '**/eslint.config.cjs',
      '**/.eslintrc.js',
      '**/.eslintrc.cjs',
      '**/playwright.config.ts',
      '**/vite.config.ts',
      '**/vitest.config.ts',
      '**/vitest.*.config.ts',
      '**/webpack.config.js',
      '**/tailwind.config.js',
      '**/postcss.config.cjs',
      '**/tailwind.ts',
      '**/esbuild-server.config.js',

      // Dependencies
      'node_modules',
      '**/node_modules',

      // Templates
      // TODO(wittjosiah): Fix lint config to lint these files.
      '*.t.ts',

      // Docs snippets
      'docs/content/**/*',
      '**/typedoc/assets/**/*',

      // Deprecated
      'packages/plugins/plugin-assistant/deprecated',

      // Other
      '**/bin',
      '**/scripts',
      '**/vendor',
      'packages/common/esbuild-plugins/polyfills',
      'packages/core/mesh/signal/testing/setup.js',
      // 'packages/sdk/shell',
      'tools/esbuild/cli.js',
    ],
    // WARNING: Do not add extra keys to this config object
    // See: https://eslint.org/docs/latest/use/configure/configuration-files#globally-ignoring-files-with-ignores
  },

  //
  // Global options
  //
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'prefer-arrow-functions': arrowFunctions,
      'unused-imports': unusedImports,
    },
  },

  //
  // Plugins and rulesets
  //
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactPlugin.configs.flat.recommended,
  storybook.configs['flat/recommended'],
  dxos.configs.recommended,

  //
  // Global overrides
  //
  {
    rules: {
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extra-parens': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-useless-constructor': ['error'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],
      '@typescript-eslint/no-this-alias': 'off',

      // TODO(dmaretskyi): New overrieds. Need to review later.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-dupe-else-if': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-for-in-array': 'off',

      'storybook/context-in-play-function': 'off',
      camelcase: 'off',
      'no-empty': 'off',
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
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
      'prefer-arrow-functions/prefer-arrow-functions': 'error',
      'require-yield': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  //
  // File-specific overrides
  //
  {
    files: ['**/*.{test,stories,blueprint-test}.{ts,tsx,js,jsx}'],
    rules: {
      'no-console': 'off',
    },
  },
);
