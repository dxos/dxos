import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input }) => {
    const { storybook } = input;
    return (
      storybook &&
      plate`
        const { mergeConfig } = require('vite');
        const { resolve } = require('path');
        
        const { ConfigPlugin } = require('@dxos/config/vite-plugin');
        const { ThemePlugin } = require('@dxos/react-ui-theme/plugin');
        
        module.exports = {
          stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
          addons: [
            '@storybook/addon-links',
            '@storybook/addon-essentials',
            '@storybook/addon-interactions'
          ],
          framework: {
            name: '@storybook/react-vite',
            options: {}
          },
          viteFinal: async (config) =>
            mergeConfig(config, {
              plugins: [
                ConfigPlugin(),
                ThemePlugin({
                  content: [
                    resolve(__dirname, '../src/**/*.{js,ts,jsx,tsx}'),
                    resolve(__dirname, '../node_modules/@dxos/react-*/dist/**/*.mjs'),
                  ]
                })
              ]
            })
        };
    `
    );
  },
});
