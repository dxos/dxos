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
      'packages/apps/composer-app/src/functions/_worker.ts',
      'packages/common/esbuild-plugins/polyfills',
      'packages/common/node-std',
      'packages/core/mesh/network-manager/module-stub.mjs',
      'packages/core/mesh/signal/testing/setup.js',
      'packages/sdk/config/src/testing',
      'packages/sdk/shell/react-i18next.d.ts',
      'packages/ui/react-ui-geo/data',
      'tools/dx-tools',
      'tools/esbuild/cli.js',
      'tools/storybook/.storybook/stub.mjs',
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
      dxos.configs.recommended,
      eslint.configs.recommended,
      reactPlugin.configs.flat.recommended,
      tseslint.configs.recommendedTypeChecked,
      prettierRecommended,
    ],
    rules: {
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': 'off', // seems broken
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-extra-parens': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-for-in-array': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/unbound-method': 'off',
      camelcase: 'off',
      'import-x/newline-after-import': [
        'error',
        {
          count: 1,
        },
      ],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: '@dxos/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
        },
      ],
      'jsx-quotes': ['error', 'prefer-single'],
      'no-constant-binary-expression': 'off',
      'no-dupe-else-if': 'off',
      'no-empty': 'off',
      'no-unsafe-optional-chaining': 'off',
      'no-unused-vars': 'off',
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
      'prettier/prettier': 'error',
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
      'require-yield': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          vars: 'all',
          varsIgnorePattern: '^_',
        },
      ],
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
    extends: [storybook.configs['flat/recommended']],
    files: [[SOURCES_GLOB, '**/*.stories.{tsx,jsx}']],
    rules: {
      'storybook/context-in-play-function': 'off',
    },
  },
);
