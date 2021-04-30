//
// Copyright 2020 DXOS.org
//

module.exports = {
  stories: ['../stories/**/*.{tsx,jsx}'],
  addons: ['@storybook/addon-actions', '@storybook/addon-links', '@storybook/addon-knobs'],
  typescript: {
    check: false,
    // checkOptions: {
    //   typescript: {
    //     typescriptPath: require.resolve('typescript')
    //     // mode: 'write-references'
    //   }
    // },
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
};
