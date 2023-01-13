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
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  viteFinal: async config => mergeConfig(config, {
    optimizeDeps: {
      include: [
        '@dxos/async',
        '@dxos/client',
        '@dxos/client-services',
        '@dxos/config',
        '@dxos/debug',
        '@dxos/devtools-mesh',
        '@dxos/feed-store',
        '@dxos/keys',
        '@dxos/messaging',
        '@dxos/messenger-model',
        '@dxos/model-factory',
        '@dxos/network-manager',
        '@dxos/object-model',
        '@dxos/protocols',
        '@dxos/react-appkit',
        '@dxos/react-async',
        '@dxos/react-client',
        '@dxos/react-components-deprecated',
        '@dxos/react-registry-client',
        '@dxos/react-toolkit',
        '@dxos/registry-client',
        '@dxos/text-model',
        '@dxos/timeframe',
        '@dxos/util'
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
