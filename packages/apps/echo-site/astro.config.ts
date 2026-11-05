//
// Copyright 2026 DXOS.org
//

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

import { assertContentExists, parsePages, readSpec, sidebarFromSpec } from './src/lib/spec.ts';

const pages = parsePages(readSpec());
assertContentExists(pages);

export default defineConfig({
  site: 'https://echo.dxos.org',
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
