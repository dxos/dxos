const { mergeConfig } = require('vite');

const { ConfigPlugin } = require('@dxos/config/vite-plugin');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-dark-mode'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      optimizeDeps: {
        include: [
          '@dxos/async',
          '@dxos/client',
          '@dxos/keys',
          '@dxos/log',
          '@dxos/config',
          '@dxos/metagraph',
          '@dxos/network-manager',
          '@dxos/protocols',
          '@dxos/react-appkit',
          '@dxos/react-async',
          '@dxos/react-client',
          '@dxos/react-ui',
          '@dxos/react-uikit',
          '@dxos/rpc',
          '@dxos/rpc-tunnel',
          '@dxos/sentry',
          '@dxos/telemetry',
          '@dxos/util'
        ]
      },
      build: {
        commonjsOptions: {
          include: [/packages/, /node_modules/]
        }
      },
      plugins: [ConfigPlugin()]
    })
};
