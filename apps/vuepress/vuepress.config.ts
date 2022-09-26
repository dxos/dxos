//
// Copyright 2022 DXOS.org
//

import { searchPlugin } from '@vuepress/plugin-search';
import { join } from 'path';
import { defaultTheme, defineUserConfig, UserConfig, viteBundler } from 'vuepress';

import { apiSidebar, DOCS_PATH, packageToModule, PINNED_PACKAGES, sidebarSection } from './src';

// Config: https://vuepress.github.io/reference/config.html
const config: UserConfig = defineUserConfig({
  title: 'DXOS',
  description: 'DXOS is an Operating System for Decentralized Software',
  // Config: https://vuepress.github.io/reference/default-theme/config.html
  theme: defaultTheme({
    logo: '/images/dxos.svg',
    logoDark: '/images/dxos-white.svg',
    docsRepo: 'dxos/dxos',
    docsBranch: 'wittjosiah/09-23-docs_Vuepress',
    docsDir: 'apps/vuepress/docs',
    navbar: [
      {
        text: 'Guide',
        link: '/guide'
      },
      {
        text: 'Reference',
        children: PINNED_PACKAGES.map(text => ({
          text,
          link: `/api/modules/${packageToModule(text)}`
        }))
      },
      {
        text: 'Github',
        link: 'https://github.com/dxos/dxos'
      }
    ],
    sidebar: {
      '/guide': sidebarSection(join(DOCS_PATH, 'guide')),
      '/api': apiSidebar()
    }
  }),
  plugins: [
    // Config: https://vuepress.github.io/reference/plugin/search.html
    searchPlugin()
  ],
  bundler: viteBundler({
    viteOptions: {
      plugins: [

      ]
    }
  })
});

export default config;
