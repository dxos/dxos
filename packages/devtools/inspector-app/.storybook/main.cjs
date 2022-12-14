const { mergeConfig } = require('vite');

const { dxosPlugin } = require('@dxos/vite-plugin');
const { NodeModulesPlugin } = require('@dxos/esbuild-plugins');

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
        '@dxos/async',
        '@dxos/client',
        '@dxos/client-services',
        '@dxos/codec-protobuf',
        '@dxos/config',
        '@dxos/credentials',
        '@dxos/debug',
        '@dxos/devtools-mesh',
        '@dxos/echo-db',
        '@dxos/feed-store',
        '@dxos/keys',
        '@dxos/messaging',
        '@dxos/messenger-model',
        '@dxos/model-factory',
        '@dxos/network-manager',
        '@dxos/object-model',
        '@dxos/protocols',
        '@dxos/react-async',
        '@dxos/react-client',
        '@dxos/react-components',
        '@dxos/react-registry-client',
        '@dxos/react-toolkit',
        '@dxos/registry-client',
        '@dxos/rpc',
        '@dxos/text-model'
      ],
      esbuildOptions: {
        plugins: [
          NodeModulesPlugin()
        ]
      }
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
