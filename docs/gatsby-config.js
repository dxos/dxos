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
            'test'
          ],
          // 'Full-Stack Tutorial': [
          //   'tutorial/introduction',
          //   'tutorial/client',
          //   'tutorial/profile',
          //   'tutorial/parties',
          //   'tutorial/invitations',
          //   'tutorial/data',
          //   'tutorial/next-steps'
          // ],
          // 'Core Concepts': [
          //   'core-concepts/party',
          //   'core-concepts/mutations',
          //   'core-concepts/queries',
          //   'core-concepts/invitations'
          // ],
          // 'Deployment': [
          //   'deployment/kube',
          //   'deployment/environment',
          // ],
          // 'API Reference': [
          //   'api-reference/dxos-client',
          // ],
        }
      }
    },
    // {
    //   resolve: 'gatsby-source-filesystem',
    //   options: {
    //     name: 'images',
    //     path: `${__dirname}/src/assets/img`
    //   }
    // },

    // Image processing
    // https://www.gatsbyjs.org/packages/gatsby-plugin-sharp
    // https://www.gatsbyjs.org/packages/gatsby-transformer-sharp
    // https://github.com/lovell/sharp
    'gatsby-plugin-sharp',
    'gatsby-transformer-sharp'
  ]
};
