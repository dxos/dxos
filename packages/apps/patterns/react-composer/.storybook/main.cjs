const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ConfigPlugin } = require('@dxos/config/vite-plugin');
const { ThemePlugin } = require('@dxos/react-ui/plugin');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    'storybook-dark-mode'
  ],
  framework: '@storybook/react',
  core: {
    builder: '@storybook/builder-vite'
  },
  features: {
    storyStoreV7: true,
    previewMdx2: true
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      optimizeDeps: {
        force: true,
        include: [
          '@dxos/client',
          '@dxos/config',
          '@dxos/debug',
          '@dxos/react-async',
          '@dxos/react-client',
          '@dxos/react-ui',
          '@dxos/react-uikit',
          '@dxos/text-model',
          'storybook-dark-mode',
          'i18next',
          'lodash/merge'
        ],
        esbuildOptions: {
          plugins: [
            {
              name: 'yjs',
              setup: ({ onResolve }) => {
                onResolve({ filter: /yjs/ }, () => {
                  return { path: require.resolve('yjs').replace('.cjs', '.mjs') };
                });
              }
            }
          ]
        }
      },
      build: {
        commonjsOptions: {
          include: [/packages/, /node_modules/]
        }
      },
      plugins: [
        ConfigPlugin(),
        ThemePlugin({
          content: [resolve(__dirname, '../src') + '/**/*.{ts,tsx,js,jsx}']
        })
      ]
    })
};
