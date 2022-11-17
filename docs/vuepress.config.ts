//
// Copyright 2022 DXOS.org
//

import { viteBundler } from '@vuepress/bundler-vite';
import { registerComponentsPlugin } from '@vuepress/plugin-register-components';
import { searchPlugin } from '@vuepress/plugin-search';
import { resolve } from 'node:path';
import { defineUserConfig, UserConfig } from 'vuepress';
// import { tocPlugin } from "@vuepress/plugin-toc";
import { hopeTheme } from 'vuepress-theme-hope';

import { showcasePlugin, apiSidebar, telemetryPlugin } from './src';

const env = (value?: string) => (value ? `'${value}'` : undefined);

// Config: https://vuepress.github.io/reference/config.html
const config: UserConfig = defineUserConfig({
  title: 'DXOS',
  description: 'The Operating System for Decentralized Software',
  pagePatterns: [
    // Defaults
    '**/*.md',
    '!.vuepress',
    '!node_modules',

    // TODO(wittjosiah): If we want to include these we need to fix links to diagrams to Vuepress can resolve them.
    '!assets',
    '!contributing',
    '!design',
    '!legacy'
  ],
  theme: hopeTheme({
    hostname: process.env.HOSTNAME ?? 'https://docs.dxos.org',
    logo: '/images/dxos.svg',
    logoDark: '/images/dxos-white.svg',
    repo: 'dxos/dxos',
    sidebar: {
      '/guide/': 'structure',
      '/api/': await apiSidebar()
    },
    navbarLayout: {
      left: ['Brand', 'Links'],
      center: [],
      right: ['Search', 'Outlook', 'Repo']
    },
    navbar: [
      {
        text: 'Guide',
        link: '/guide/'
      },
      {
        text: 'API',
        link: '/api/'
      }
    ]
  }),
  // Config: https://vuepress.github.io/reference/default-theme/config.html
  // theme: defaultTheme({
  //   docsRepo: 'dxos/dxos',
  //   docsBranch: 'main',
  //   docsDir: 'docs/docs',
  //   navbar: [
  //     {
  //       text: 'Guide',
  //       link: '/guide'
  //     },
  //     {
  //       text: 'Reference',
  //       link: '/api',
  //       children: PINNED_PACKAGES.map((text) => ({
  //         text,
  //         link: link.package(text)
  //       }))
  //     },
  //     {
  //       text: 'Github',
  //       link: 'https://github.com/dxos/dxos'
  //     }
  //   ],
  //   sidebar: {
  //     '/guide': sidebarSection(join(DOCS_PATH, 'guide')),
  //     '/api': await apiSidebar()
  //   }
  // }),
  plugins: [
    // Config: https://vuepress.github.io/reference/plugin/register-components.html
    registerComponentsPlugin({
      componentsDir: resolve(__dirname, './src/components')
    }),
    // Config: https://vuepress.github.io/reference/plugin/search.html
    searchPlugin(),
    telemetryPlugin(),
    await showcasePlugin()
    // (tocPlugin as Function)({})
  ],
  bundler: viteBundler({
    viteOptions: {
      define: {
        'process.env.DX_ENVIRONMENT': env(process.env.DX_ENVIRONMENT),
        'process.env.DX_RELEASE': env(process.env.DX_RELEASE),
        'process.env.TELEMETRY_API_KEY': env(process.env.TELEMETRY_API_KEY)
      },
      optimizeDeps: {
        force: true,
        include: ['@dxos/telemetry']
      },
      build: {
        commonjsOptions: {
          include: [/packages/, /node_modules/]
        }
      }
    }
  })
});

export default config;
