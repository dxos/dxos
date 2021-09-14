//
// Copyright 2020 DXOS.org
//

const themeOptions = require('@dxos/docs-theme/theme-options');

module.exports = {
  pathPrefix: '/sdk',
  plugins: [
    {
      resolve: 'gatsby-theme-apollo-docs',
      options: {
        ...themeOptions,
        root: __dirname,
        subtitle: 'SDK',
        description: 'DXOS: The Decentralized Operating System',
        githubRepo: 'dxos/protocols',
        sidebarCategories: {
          null: [
            'index' // Required.
          ],
          'Full-Stack Tutorial': [
            'tutorial/introduction',
            'tutorial/client',
            'tutorial/profile',
            'tutorial/parties',
            'tutorial/creating',
            'tutorial/queries',
            'tutorial/mutations',
            'tutorial/invitations',
            'tutorial/next'
          ],
          'Core Concepts': [
            'core-concepts/party',
            'core-concepts/queries',
            'core-concepts/mutations',
            'core-concepts/invitations'
          ],
          'Publishing': [
            'publishing/configuration',
            'publishing/kube',
          ],
          'API Reference': [
            'api-reference/dxos-client',
          ],
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
