const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ConfigPlugin } = require('@dxos/config/vite-plugin');
const { ThemePlugin } = require('@dxos/react-components/plugin');

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
        force: true,
        include: [
          '@dxos/client/testing',
          '@dxos/config',
          '@dxos/keys',
          '@dxos/log',
          '@dxos/protocols',
          '@dxos/protocols/proto/dxos/client',
          '@dxos/protocols/proto/dxos/client/services',
          '@dxos/protocols/proto/dxos/config',
          '@dxos/protocols/proto/dxos/echo/feed',
          '@dxos/protocols/proto/dxos/echo/model/object',
          '@dxos/protocols/proto/dxos/echo/object',
          '@dxos/protocols/proto/dxos/halo/credentials',
          '@dxos/protocols/proto/dxos/halo/invitations',
          '@dxos/protocols/proto/dxos/halo/keys',
          '@dxos/protocols/proto/dxos/mesh/bridge',
          '@dxos/protocols/proto/dxos/rpc',
          '@dxos/react-client/testing',
          'storybook-dark-mode'
        ]
      },
      build: {
        commonjsOptions: {
          include: [/packages/, /node_modules/]
        }
      },
      plugins: [
        ConfigPlugin(),
        ThemePlugin({
          content: [
            resolve(__dirname, '../src/**/*.{js,ts,jsx,tsx}'),
            resolve(__dirname, '../node_modules/@dxos/react-components/dist/**/*.js')
          ]
        })
      ]
    })
};
