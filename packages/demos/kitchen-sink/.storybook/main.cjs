const { yamlPlugin } = require('esbuild-plugin-yaml');
const { mergeConfig } = require('vite');

const { dxosPlugin } = require('@dxos/vite-plugin');

module.exports = {
  stories: [
    '../src/**/*.stories.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
    '../stories/**/*.stories.mdx',
    '../stories/**/*.stories.@(js|jsx|ts|tsx)'
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
        '@dxos/async',
        '@dxos/client',
        '@dxos/client-testing',
        '@dxos/config',
        '@dxos/debug',
        '@dxos/echo-db',
        '@dxos/echo-protocol',
        '@dxos/echo-testing',
        '@dxos/object-model',
        '@dxos/react-client',
        '@dxos/react-client-testing',
        '@dxos/react-components',
        '@dxos/react-echo-graph',
        '@dxos/react-ipfs',
        '@dxos/react-toolkit'
      ]
    },
    build: {
      commonjsOptions: {
        include: [
          /async/,
          /client/,
          /client-testing/,
          /config/,
          /debug/,
          /echo-db/,
          /echo-protocol/,
          /echo-testing/,
          /object-model/,
          /react-client/,
          /react-client-testing/,
          /react-components/,
          /react-echo-graph/,
          /react-ipfs/,
          /react-toolkit/,
          /node_modules/
        ]
      }
    },
    plugins: [dxosPlugin()]
  })
};
