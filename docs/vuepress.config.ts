//
// Copyright 2022 DXOS.org
//

import { viteBundler } from '@vuepress/bundler-vite';
import { registerComponentsPlugin } from '@vuepress/plugin-register-components';
import { searchPlugin } from '@vuepress/plugin-search';
import { resolve } from 'node:path';
import { defineUserConfig, UserConfig } from 'vuepress';
import { hopeTheme } from 'vuepress-theme-hope';

import { MarkdownIt } from '@dxos/apidoc';

import { apiSidebar, telemetryPlugin } from './src';

const env = (value?: string) => (value ? `'${value}'` : undefined);

const DXOS_DEPS = [
  '@dxos/client/testing',
  '@dxos/config',
  '@dxos/keys',
  '@dxos/log',
  '@dxos/protocols',
  '@dxos/protocols/proto/dxos/client',
  '@dxos/protocols/proto/dxos/client/services',
  '@dxos/protocols/proto/dxos/config',
  '@dxos/protocols/proto/dxos/echo/feed',
  '@dxos/protocols/proto/dxos/echo/model/object',
  '@dxos/protocols/proto/dxos/echo/object',
  '@dxos/protocols/proto/dxos/halo/credentials',
  '@dxos/protocols/proto/dxos/halo/invitations',
  '@dxos/protocols/proto/dxos/halo/keys',
  '@dxos/protocols/proto/dxos/mesh/bridge',
  '@dxos/protocols/proto/dxos/rpc'
];

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
    '!legacy',
    '!specs'
  ],
  extendsMarkdown: (md) => {
    md.use(MarkdownIt.apiDocRenderDirective);
    md.use(MarkdownIt.showcaseRenderDirective);
  },
  theme: hopeTheme({
    hostname: process.env.HOSTNAME ?? 'https://docs.dxos.org',
    logo: '/images/dxos.svg',
    logoDark: '/images/dxos-white.svg',
    repo: 'dxos/dxos',
    // TODO(wittjosiah): Use release tag?
    docsBranch: 'main',
    docsDir: 'docs/docs',
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
    ],
    plugins: {
      mdEnhance: {
        sub: true,
        sup: true,
        attrs: true,
        figure: true
      }
    }
  }),
  plugins: [
    // Config: https://vuepress.github.io/reference/plugin/register-components.html
    registerComponentsPlugin({
      components: {
        Showcase: resolve(__dirname, './src/components/Showcase.vue')
      }
    }),
    // Config: https://vuepress.github.io/reference/plugin/search.html
    searchPlugin(),
    telemetryPlugin()
  ],
  bundler: viteBundler({
    viteOptions: {
      define: {
        'process.env.DX_ENVIRONMENT': env(process.env.DX_ENVIRONMENT),
        'process.env.DX_RELEASE': env(process.env.DX_RELEASE),
        'process.env.DX_TELEMETRY_API_KEY': env(process.env.DX_TELEMETRY_API_KEY)
      },
      optimizeDeps: {
        force: true,
        include: DXOS_DEPS
      },
      // Do not try to resolve DXOS deps in ssr mode or bundling fails currently.
      ssr: {
        external: DXOS_DEPS
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
