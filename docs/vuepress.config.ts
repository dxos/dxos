//
// Copyright 2022 DXOS.org
//

import { viteBundler } from '@vuepress/bundler-vite';
import { registerComponentsPlugin } from '@vuepress/plugin-register-components';
import { searchPlugin } from '@vuepress/plugin-search';
import { resolve } from 'node:path';
import { defineUserConfig, UserConfig } from 'vuepress';
import { hopeTheme, sidebar } from 'vuepress-theme-hope';

import { MarkdownIt } from '@dxos/apidoc';

import { apiSidebar, telemetryPlugin } from './src';

const env = (value?: string) => (value ? `'${value}'` : undefined);

// Config: https://vuepress.github.io/reference/config.html
const config: UserConfig = defineUserConfig({
  title: 'DXOS', // Used in browser title.
  description: 'Build cloudless, collaborative software',
  pagePatterns: [
    // Defaults
    '**/*.md',
    '!.vuepress',
    '!node_modules',

    // TODO(wittjosiah): If we want to include these we need to fix links to diagrams to Vuepress can resolve them.
    '!assets',
    '!contributing',
    '!design',
    '!legacy',
    '!specs',
  ],
  extendsMarkdown: (md) => {
    md.use(MarkdownIt.apiDocRenderDirective);
    md.use(MarkdownIt.showcaseRenderDirective);
  },
  markdown: {
    toc: {
      level: [1, 2, 3, 4],
    },
  },
  theme: hopeTheme({
    hostname: process.env.HOSTNAME ?? 'https://docs.dxos.org',
    iconAssets: 'https://unpkg.com/@phosphor-icons/web@2.0.3/src/regular/style.css',
    iconPrefix: 'ph ph-',
    // Header logotype.
    logo: '/images/logotype/dxos-horizontal.svg',
    logoDark: '/images/logotype/dxos-horizontal-white.svg',
    repo: 'dxos/dxos',
    // TODO(wittjosiah): Use release tag?
    docsBranch: 'main',
    docsDir: 'docs/content',
    sidebar: sidebar({
      '/guide/': 'structure',
      '/api/': await apiSidebar(),
      '/composer/': 'structure',
    }),
    navbarLayout: {
      start: ['Brand', 'Links'],
      center: [],
      end: ['Search', 'Outlook', 'Repo'],
    },
    navTitle: false,
    navbar: [
      {
        text: 'Composer',
        link: '/composer/',
      },
      {
        text: 'SDK',
        link: '/guide/',
      },
      {
        text: 'API',
        link: '/api/',
      },
    ],
    backToTop: false,
    plugins: {
      mdEnhance: {
        codetabs: true,
        sub: true,
        sup: true,
        attrs: true,
        figure: true,
        imgMark: true,
        mermaid: true,
      },
      readingTime: false,
    },
  }),
  plugins: [
    // Config: https://vuepress.github.io/reference/plugin/register-components.html
    registerComponentsPlugin({
      components: {
        Showcase: resolve(__dirname, './src/components/Showcase.vue'),
      },
    }),
    // Config: https://vuepress.github.io/reference/plugin/search.html
    searchPlugin({
      // Search currently doesn't give any kind of "there are more results than you're seeing" indicator,
      // so set this high:
      maxSuggestions: 20,
    }),
    telemetryPlugin(),
  ],
  bundler: viteBundler({
    viteOptions: {
      define: {
        'process.env.DX_ENVIRONMENT': env(process.env.DX_ENVIRONMENT),
        'process.env.DX_RELEASE': env(process.env.DX_RELEASE),
        'process.env.DX_TELEMETRY_API_KEY': env(process.env.DX_TELEMETRY_API_KEY),
      },
      // Do not try to resolve DXOS deps in ssr mode or bundling fails currently.
      ssr: {
        external: ['@dxos/client', '@dxos/client-services/testing', '@dxos/react-client', '@dxos/echo-schema'],
      },
    },
  }),
});

export default config;
