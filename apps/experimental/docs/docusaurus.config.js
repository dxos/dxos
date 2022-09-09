//
// Copyright 2022 DXOS.org
//

// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

// https://docusaurus.io/docs/api/docusaurus-config

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/okaidia');
const siteUrl = process.env.DXOS_SITE_URL || 'https://dxos.org/';
const githubDocsDirectory = 'https://github.com/dxos/web/blob/main/packages/docs/';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'DXOS',
  tagline: 'The Decentralized Operating System',
  url: siteUrl,
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'dxos',
  projectName: 'DXOS',
  // TODO(zarco): Try fixing webpack to use DXOS Stack.
  plugins: [
    './plugins/webpack-plugin.js'
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: githubDocsDirectory,
          sidebarItemsGenerator: async ({ defaultSidebarItemsGenerator, ...args }) => {
            const sidebarItems = await defaultSidebarItemsGenerator(args);
            return sidebarItems.filter(item =>
              process.env.HIDE_WIP && 'label' in item ? !item.label?.startsWith('wip-') : true
            );
          }
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl: `${githubDocsDirectory}blog/`
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      })
    ]
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'light',
        disableSwitch: true
      },
      navbar: {
        logo: {
          alt: 'DXOS',
          src: 'img/dxos-horizontal.svg',
          srcDark: 'img/dxos-horizontal-white.svg',
          // Use `target: "_blank"` to go back to Gatsby Site.
          // DO NOT REMOVE because it causes issues with the internal redirects
          target: '_blank'
        },
        items: [
          {
            type: 'doc',
            docId: 'home',
            position: 'left',
            label: 'Docs'
          },
          {
            to: '/blog',
            label: 'Blog',
            position: 'left'
          },
          {
            to: '/showcase',
            label: 'Showcase',
            position: 'left'
          },
          {
            href: 'https://github.com/dxos',
            label: 'GitHub',
            position: 'right'
          }
        ]
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Home',
                to: '/docs/home'
              },
              {
                label: 'Reference',
                to: '/docs/api-reference/client'
              }
            ]
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/6kzjEMTd'
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/dxos_org'
              }
            ]
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog'
              },
              {
                label: 'GitHub',
                href: 'https://github.com/dxos'
              }
            ]
          }
        ],
        copyright: `Copyright © ${new Date().getFullYear()} DXOS.org`
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme
      }
    })
};

module.exports = config;
