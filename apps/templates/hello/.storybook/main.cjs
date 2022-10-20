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
        '@dxos/react-client',
        '@dxos/react-client-testing',
        '@dxos/react-components',
        '@dxos/react-toolkit'
      ]
    },
    build: {
      commonjsOptions: {
        include: [
          /packages/,
          /node_modules/
        ]
      }
    },
    plugins: [dxosPlugin()]
  })
};
