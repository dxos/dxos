//
// Copyright 2026 DXOS.org
//

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

import { assertContentExists, parsePages, readSpec, sidebarFromSpec } from './src/lib/spec.ts';

const BASE = '/echo';

const pages = parsePages(readSpec());
assertContentExists(pages);

// The preview opens the server's origin, which sits outside the base path and would otherwise 404.
// Goes ahead of Astro's base middleware, which strips the base and would make `/echo/` look like `/`.
const redirectRootToBase = (): Plugin => ({
  name: 'echo-site:redirect-root-to-base',
  enforce: 'post',
  configureServer: (server) => () => {
    server.middlewares.stack.unshift({
      route: '',
      handle: (request: IncomingMessage, response: ServerResponse, next: () => void) => {
        if (request.url === '/') {
          response.writeHead(302, { Location: `${BASE}/` });
          response.end();
          return;
        }
        next();
      },
    });
  },
});

export default defineConfig({
  site: 'https://docs.dxos.org',
  base: BASE,
  vite: { plugins: [redirectRootToBase()] },
  integrations: [
    starlight({
      title: 'ECHO',
      description: 'The typed, local-first object graph.',
      favicon: '/favicon.svg',
      lastUpdated: false,
      customCss: ['./src/styles/tokens.generated.css', './src/styles/fonts.css', './src/styles/theme.css'],
      components: {
        Footer: './src/components/Footer.astro',
        Hero: './src/components/Hero.astro',
        SiteTitle: './src/components/SiteTitle.astro',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/dxos/dxos' },
        { icon: 'discord', label: 'Discord', href: 'https://dxos.org/discord' },
      ],
      sidebar: sidebarFromSpec(pages),
    }),
  ],
});
