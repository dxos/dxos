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
    'packages/common/protocols/proto/**/*',
    'packages/sdk/client/src/packlets/proxy/version.ts',

    // Config
    '.eslintrc.js',
    '.mocharc.js',
    'jest.config.js',
    'jest.config.ts',
    'esbuild-server.config.js',
    'webpack.config.js',

    // Dependencies
    'node_modules'
  ],
  overrides: [
    {
      files: '**/*.{ts,tsx,js,jsx}',
      extends: [
        'plugin:@dxos/recommended'
      ]
    },
    {
      files: '**/*.t.ts',
      extends: [
        'plugin:@dxos/typescript'
      ],
      parserOptions: {
        project: './tsconfig.plate.json'
      }
    },
    {
      files: '**/vite.config.ts',
      extends: [
        'plugin:@dxos/typescript'
      ],
      parserOptions: {
        project: './tsconfig.node.json'
      }
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
