//
// Copyright 2022 DXOS.org
//

require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  ignorePatterns: [
    // Binaries
    'bin',
    'main.js',

    // Build Artifacts
    'dist',
    'out',
    '**/proto/gen/*',
    'packages/core/protocols/proto/**/*',
    'packages/sdk/client/src/version.ts',

    // Config
    '.eslintrc.js',
    '.mocharc.js',
    'esbuild-server.config.js',
    'webpack.config.js',
    'vite.config.ts',

    // Dependencies
    'node_modules',

    // Templates
    // TODO(wittjosiah): Fix lint config to lint these files.
    '*.t.ts'
  ],
  overrides: [
    {
      files: '**/*.{ts,tsx,js,jsx}',
      extends: [
        'plugin:@dxos/recommended'
      ]
    },
    {
      files: '**/*.{ts,tsx}',
      extends: [
        'plugin:@dxos/typescript'
      ]
    },
    {
      files: '**/*.{tsx,jsx}',
      extends: [
        'plugin:@dxos/react'
      ]
    },
    {
      files: '**/*.test.{ts,tsx,js,jsx}',
      extends: [
        'plugin:@dxos/test'
      ]
    }
  ]
};
