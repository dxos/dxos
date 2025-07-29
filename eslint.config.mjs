// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import storybook from 'eslint-plugin-storybook';
import dxos from '@dxos/eslint-plugin-rules';
import arrowFunctions from 'eslint-plugin-prefer-arrow-functions';
import unusedImports from 'eslint-plugin-unused-imports';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import importX from 'eslint-plugin-import-x';

const SOURCES_GLOB = '**/{src,config,.storybook}/**';

export default tseslint.config(
  //
  // Global ignores.
  //
  {
    // WARNING: Do not add extra keys to this config object
    // See: https://eslint.org/docs/latest/use/configure/configuration-files#globally-ignoring-files-with-ignores
    ignores: [
      // Build Artifacts
      '**/dist',
      '**/out',
      '**/gen/*',
      '**/__swc_snapshots__',
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
      'tools/esbuild/cli.js',
      'packages/sdk/shell/react-i18next.d.ts',
      'packages/core/mesh/network-manager/module-stub.mjs',
      'packages/ui/react-ui-geo/data',
      'packages/apps/composer-app/src/functions/_worker.ts',
      'packages/common/node-std',
      'packages/sdk/config/src/testing',
      'tools/dx-tools',
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
      'import-x': importX,
    },
  },

  //
  // All files.
  //
  {
    files: [[SOURCES_GLOB, '**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}']],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactPlugin.configs.flat.recommended,
      prettierRecommended,
      dxos.configs.recommended,
      prettierRecommended,
    ],
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
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': 'off', // seems broken
      '@typescript-eslint/no-this-alias': 'off',

      // TODO(dmaretskyi): New overrides. Need to review later.
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
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-for-in-array': 'off',
      camelcase: 'off',
      'no-dupe-else-if': 'off',
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
      'prettier/prettier': 'error',
      'no-constant-binary-expression': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      'import-x/newline-after-import': [
        'error',
        {
          count: 1,
        },
      ],
      'import-x/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
          },
          groups: [['builtin', 'external'], 'internal'],
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '@{dxos,braneframe}/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['@{dxos,braneframe}/**'],
        },
      ],
      // TODO(dmaretskyi): To re-enable.
      'no-unsafe-optional-chaining': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
    },
  },

  //
  // Tests.
  //
  {
    files: [[SOURCES_GLOB, '**/*.{test,stories,blueprint-test}.{js,ts,jsx,tsx,mts,cts,mjs,cjs}']],
    rules: {
      'no-console': 'off',
    },
  },

  //
  // Stories.
  //
  {
    files: [[SOURCES_GLOB, '**/*.stories.{tsx,jsx}']],
    extends: [storybook.configs['flat/recommended']],
    rules: {
      'storybook/context-in-play-function': 'off',
    },
  },
);
