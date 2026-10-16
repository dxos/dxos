//
// Copyright 2025 DXOS.org
//

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';

// https://astro.build/config
export default defineConfig({
  site: 'https://dxos.org',
  integrations: [
    starlight({
      title: 'DXOS Documentation',
      lastUpdated: true,
      favicon: '/favicon.ico',
      components: {
        Head: './src/components/Head.astro',
        // TODO(wittjosiah): Uncomment to link logo to home page.
        // SiteTitle: './src/components/CustomSiteTitle.astro',
      },
      logo: {
        light: './src/assets/logotype/dxos-horizontal.svg',
        dark: './src/assets/logotype/dxos-horizontal-white.svg',
        alt: 'DXOS Logotype',
        replacesTitle: true,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/dxos/dxos' },
        { icon: 'discord', label: 'Discord', href: 'https://dxos.org/discord' },
        { icon: 'blueSky', label: 'Bluesky', href: 'https://bsky.app/profile/dxos.org' },
        { icon: 'x.com', label: 'X', href: 'https://x.com/dxos_org' },
      ],
      expressiveCode: {
        themes: ['github-light', 'github-dark'],
      },
      // TODO(wittjosiah): Nested docs subdir is needed because link validation doesn't work with generateId config.
      sidebar: [
        {
          label: 'Introduction',
          slug: 'docs',
        },
        {
          label: 'Composer',
          items: [{ autogenerate: { directory: 'docs/composer' } }],
          collapsed: false,
        },
        {
          label: 'ECHO Database',
          items: [
            {
              label: 'Introduction',
              slug: 'docs/echo/introduction',
            },
            {
              label: 'Installation',
              items: [{ autogenerate: { directory: 'docs/echo/installation' } }],
            },
            {
              label: 'Typescript',
              items: [{ autogenerate: { directory: 'docs/echo/typescript' } }],
            },
            {
              label: 'React',
              items: [{ autogenerate: { directory: 'docs/echo/react' } }],
            },
          ],
          collapsed: false,
        },
        {
          label: 'HALO Identity',
          items: [{ autogenerate: { directory: 'docs/halo' } }],
          collapsed: false,
        },
        {
          label: 'Additional Resources',
          items: [{ autogenerate: { directory: 'docs/additional-resources' } }],
          collapsed: false,
        },
      ],
      // The validator cannot resolve links to custom pages under `src/pages` (`/blog`, `/privacy`,
      // `/terms`) — they are not content-collection routes.
      plugins: [starlightLinksValidator({ exclude: ['/typedoc/**', '/blog/**', '/privacy', '/terms'] })],
    }),
  ],
});
