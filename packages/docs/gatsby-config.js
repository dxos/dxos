//
// Copyright 2020 DXOS.org
//

const themeOptions = require('@dxos/docs-theme/theme-options');

module.exports = {
  plugins: [
    {
      resolve: 'gatsby-theme-apollo-docs',
      options: {
        ...themeOptions,
        root: __dirname,
        description: 'DXOS - The Decentralized Operating System',
        subtitle: 'ECHO',
        sidebarCategories: {
          null: [
            'index',
            'echo'
          ]
        }
      }
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'images',
        path: `${__dirname}/src/assets/img`
      }
    },

    // Image processing
    // https://www.gatsbyjs.org/packages/gatsby-plugin-sharp
    // https://www.gatsbyjs.org/packages/gatsby-transformer-sharp
    // https://github.com/lovell/sharp
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp'
  ]
};
