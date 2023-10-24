const { mergeConfig } = require('vite');
const { resolve } = require('path');

const { ThemePlugin } = require('@dxos/react-ui-theme/plugin');

module.exports = {
  stories: ['../../stories/html/**/*.stories.mdx', '../../stories/html/**/*.stories.@(js|jsx|ts|tsx)'],
  framework: {
    name: '@storybook/html-vite',
    options: {}
  }
};
