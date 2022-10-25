//
// Copyright 2022 DXOS.org
//

import { viteBundler } from '@vuepress/bundler-vite';
import { registerComponentsPlugin } from '@vuepress/plugin-register-components';
import { searchPlugin } from '@vuepress/plugin-search';
import { join, resolve } from 'node:path';
import { defaultTheme, defineUserConfig, UserConfig } from 'vuepress';

import { apiSidebar, DOCS_PATH, link, PINNED_PACKAGES, showcasePlugin, sidebarSection, telemetryPlugin } from './src';

// Config: https://vuepress.github.io/reference/config.html
const config: UserConfig = defineUserConfig({
  title: 'DXOS',
  description: 'An Operating System for Decentralized Software',
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
  // Config: https://vuepress.github.io/reference/default-theme/config.html
  theme: defaultTheme({
    logo: '/images/dxos.svg',
    logoDark: '/images/dxos-white.svg',
    docsRepo: 'dxos/dxos',
    docsBranch: 'main',
    docsDir: 'docs/docs',
    navbar: [
      {
        text: 'Guide',
        link: '/guide'
      },
      {
        text: 'Reference',
        link: '/api',
        children: PINNED_PACKAGES.map((text) => ({
          text,
          link: link.package(text)
        }))
      },
      {
        text: 'Github',
        link: 'https://github.com/dxos/dxos'
      }
    ],
    sidebar: {
      '/guide': sidebarSection(join(DOCS_PATH, 'guide')),
      '/api': await apiSidebar()
    }
  }),
  plugins: [
    // Config: https://vuepress.github.io/reference/plugin/register-components.html
    registerComponentsPlugin({
      componentsDir: resolve(__dirname, './src/components')
    }),
    // Config: https://vuepress.github.io/reference/plugin/search.html
    searchPlugin(),
    telemetryPlugin(),
    await showcasePlugin()
  ],
  bundler: viteBundler({
    viteOptions: {
      resolve: {
        alias: {
          'node:assert': 'assert/'
        }
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
