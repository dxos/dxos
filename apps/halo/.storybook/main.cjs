const { mergeConfig } = require('vite');

const { dxosPlugin } = require('@dxos/vite-plugin');

module.exports = {
  stories: [
    '../src/**/*.stories.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions'
  ],
  framework: '@storybook/react',
  core: {
    builder: '@storybook/builder-vite'
  },
  features: {
    storyStoreV7: true,
    previewMdx2: true
  },
  viteFinal: async config => mergeConfig(config, {
    optimizeDeps: {
      include: [
        '@dxos/client',
        '@dxos/config',
        '@dxos/protocols',
        '@dxos/react-async',
        '@dxos/react-client',
        '@dxos/react-client-testing',
        '@dxos/react-components',
        '@dxos/react-toolkit',
        '@dxos/util'
      ]
    },
    build: {
      commonjsOptions: {
        include: [
          /client/,
          /config/,
          /protocols/,
          /react-async/,
          /react-client/,
          /react-client-testing/,
          /react-components/,
          /react-toolkit/,
          /util/,
          /node_modules/
        ]
      }
    },
    plugins: [dxosPlugin()]
  })
};
