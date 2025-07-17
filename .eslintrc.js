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
    'deprecated',
    '**/proto/gen/*',
    'packages/core/protocols/proto/**/*',
    'packages/sdk/client/src/version.ts',
    'packages/sdk/client-services/src/version.ts',

    // Config
    '.eslintrc.js',
    '.mocharc.js',
    'astro.config.ts',
    'esbuild-server.config.js',
    'playwright.config.ts',
    'tailwind.ts',
    'vite.config.ts',
    'vitest.config.ts',
    'vitest.*.config.ts',
    'webpack.config.js',

    // Dependencies
    'node_modules',

    // Templates
    // TODO(wittjosiah): Fix lint config to lint these files.
    '*.t.ts',

    // TypeDoc output
    '**/typedoc/assets/**/*',
  ],

  rules: {
    // Suspected bug mistakes all `play` functions for storybook.play.
    'storybook/context-in-play-function': 'off',
  },

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
    // TODO(burdon): Build step to generate translations.json.
    // {
    //   extends: ['plugin:i18next/recommended'],
    //   files: '**/*.{ts,tsx,js,jsx}',
    //   overrides: [
    //     {
    //       "files": [
    //         '*.stories.@(js|jsx|ts|tsx)',
    //         '*.test.@(js|jsx|ts|tsx)',
    //       ],
    //       "rules": {
    //         "i18next/no-literal-string": "off"
    //       }
    //     }
    //   ]
    // },
    {
      files: '**/*.{test,stories,blueprint-test}.{ts,tsx,js,jsx}',
      rules: {
        'no-console': 'off',
      },
    },
  ],

  extends: ['plugin:storybook/recommended'],
};
