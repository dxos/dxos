//
// Copyright 2020 DXOS.org
//

const themeOptions = require("@dxos/docs-theme/theme-options");

module.exports = {
  pathPrefix: "/sdk",
  plugins: [
    {
      resolve: "gatsby-theme-apollo-docs",
      options: {
        ...themeOptions,
        root: __dirname,
        description: "DXOS - The Decentralized Operating System",
        subtitle: "SDK",
        githubRepo: "dxos/protocols",
        sidebarCategories: {
          Tutorial: [
            "tutorial/introduction",
            "tutorial/client",
            "tutorial/profile",
            "tutorial/party",
            "tutorial/invite",
            "tutorial/data",
            "tutorial/environment",
            "tutorial/deployment",
            "tutorial/next-steps"
          ],
          "Core Concepts": [
            "core-concepts/client",
            "core-concepts/party",
            "core-concepts/mutations",
            "core-concepts/queries",
            "core-concepts/invitations",
            "core-concepts/deployment",
          ],
        }
      }
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: `${__dirname}/src/assets/img`
      }
    },

    // Image processing
    // https://www.gatsbyjs.org/packages/gatsby-plugin-sharp
    // https://www.gatsbyjs.org/packages/gatsby-transformer-sharp
    // https://github.com/lovell/sharp
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp"
  ]
};
