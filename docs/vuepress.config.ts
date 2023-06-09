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
    '!legacy',
    '!specs',
  ],
  extendsMarkdown: (md) => {
    md.use(MarkdownIt.apiDocRenderDirective);
    md.use(MarkdownIt.showcaseRenderDirective);
  },
  theme: hopeTheme({
    hostname: process.env.HOSTNAME ?? 'https://docs.dxos.org',
    // Header logotype.
    logo: '/images/logotype/dxos-horizontal.svg',
    logoDark: '/images/logotype/dxos-horizontal-white.svg',
    repo: 'dxos/dxos',
    // TODO(wittjosiah): Use release tag?
    docsBranch: 'main',
    docsDir: 'docs/docs',
    sidebar: sidebar({
      '/guide/': 'structure',
      '/api/': await apiSidebar(),
    }),
    navbarLayout: {
      start: ['Brand', 'Links'],
      center: [],
      end: ['Search', 'Outlook', 'Repo'],
    },
    navbar: [
      {
        text: 'Guide',
        link: '/guide/',
      },
      {
        text: 'API',
        link: '/api/',
      },
    ],
    plugins: {
      mdEnhance: {
        codetabs: true,
        sub: true,
        sup: true,
        attrs: true,
        figure: true,
        imgMark: true,
      },
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
    searchPlugin(),
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
