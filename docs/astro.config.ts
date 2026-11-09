//
// Copyright 2025 DXOS.org
//

import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import path from 'node:path';
import starlightLinksValidator from 'starlight-links-validator';
import { type Plugin } from 'vite';
import wasm from 'vite-plugin-wasm';

import { pluginConfigPlugin } from '@dxos/app-framework/vite-plugin';
import { LAYER_ORDER, ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';
import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';
import { ModuleUrlPlugin } from '@dxos/vite-plugin-module-url';

import { generateIslandBase, generateTheme, generateWebflowScoped } from './scripts/gen-theme.mjs';
import { ISLAND_ROOTS, PAGE_LAYERS } from './src/demos/layers.ts';
import { assertContentExists, parsePages, readSpec, sidebarFromSpec } from './src/echo/spec.ts';

generateTheme();
generateIslandBase(ISLAND_ROOTS);
generateWebflowScoped(ISLAND_ROOTS);

const themeLayers = PAGE_LAYERS.filter((name) => (LAYER_ORDER as readonly string[]).includes(name));
if (themeLayers.join() !== LAYER_ORDER.join()) {
  throw new Error(`PAGE_LAYERS no longer contains the theme's LAYER_ORDER: ${LAYER_ORDER.join(', ')}`);
}

const echoPages = parsePages(readSpec());
assertContentExists(echoPages);

/** Node builtins the `@dxos/*` sources import, shimmed for the browser only: the server build needs the real ones. */
const browserNodeStd = (): Plugin => ({
  name: 'docs:browser-node-std',
  enforce: 'pre',
  applyToEnvironment: (environment) => environment.name === 'client',
  resolveId(id, importer) {
    const name = /^(?:node:)?(util|path|crypto|stream)$/.exec(id)?.[1];
    return name ? this.resolve(`@dxos/node-std/${name}`, importer, { skipSelf: true }) : undefined;
  },
});

const rootDir = path.resolve(import.meta.dirname, '..');
const phosphorIconsCore = path.join(rootDir, 'node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, 'packages/ui/brand/assets/icons');
const extendedIcons = path.join(rootDir, 'packages/ui/ui-icons/assets');

// https://astro.build/config
export default defineConfig({
  site: 'https://dxos.org',
  // The `/echo` demos are React islands built from the workspace's `@dxos/*` sources and the react-ui theme.
  vite: {
    plugins: [
      // Replaces each plugin's `dx.config.ts` with its manifest, as in the apps.
      pluginConfigPlugin(),
      importSource({ include: ['@dxos/**', '#*'] }),
      browserNodeStd(),
      DxosLogPlugin(),
      ModuleUrlPlugin(),
      IconsPlugin({
        symbolPattern: iconSymbolPattern({ sets: ['ph', 'dx', 'px'], regularOnly: ['dx', 'px'] }),
        assetPath: (iconSet, name, variant) => {
          switch (iconSet) {
            case 'dx':
              return `${dxosIcons}/${name}.svg`;
            case 'px':
              return `${extendedIcons}/${name}.svg`;
            default:
              return `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`;
          }
        },
        spriteFile: 'icons.svg',
        contentPaths: [
          path.join(rootDir, '{packages,tools}/**/dist/**/*.{mjs,html}'),
          path.join(rootDir, '{packages,tools}/**/src/**/*.{ts,tsx,js,jsx,css,md,html}'),
          path.join(import.meta.dirname, 'src/demos/**/*.{ts,tsx}'),
        ],
        scanPaths: [path.join(rootDir, 'packages/ui/ui-icons/src/index.ts')],
      }),
      ThemePlugin({ srcCssPath: path.join(import.meta.dirname, 'src/styles/demo-theme.css') }),
      wasm(),
    ],
    optimizeDeps: {
      exclude: ['@dxos/wa-sqlite', '@automerge/automerge', '@automerge/automerge-subduction'],
    },
    // Workers the demos start load wasm with top-level await, which only an ES module worker supports.
    worker: {
      format: 'es',
      plugins: () => [importSource({ include: ['@dxos/**', '#*'] }), browserNodeStd(), DxosLogPlugin(), wasm()],
    },
  },
  integrations: [
    react({ include: ['**/src/demos/**', '**/src/tutorial/**'] }),
    starlight({
      title: 'DXOS Documentation',
      lastUpdated: true,
      favicon: '/favicon.ico',
      customCss: ['./src/styles/tokens.generated.css', './src/styles/fonts.css', './src/styles/theme.css'],
      components: {
        Footer: './src/components/Footer.astro',
        Head: './src/components/Head.astro',
        Header: './src/components/Header.astro',
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
      // TODO(wittjosiah): Nested docs subdir is needed because link validation doesn't work with generateId config.
      sidebar: [
        {
          label: 'Introduction',
          slug: 'docs',
        },
        {
          label: 'ECHO',
          items: sidebarFromSpec(echoPages),
          collapsed: false,
        },
        {
          label: 'HALO Identity',
          items: [{ autogenerate: { directory: 'docs/halo' } }],
          collapsed: false,
        },
        {
          label: 'Composer',
          items: [{ autogenerate: { directory: 'docs/composer' } }],
          collapsed: false,
        },
        {
          label: 'Additional Resources',
          items: [{ autogenerate: { directory: 'docs/additional-resources' } }],
          collapsed: false,
        },
      ],
      // The validator cannot resolve custom pages under `src/pages` (`/blog`, `/privacy`, `/terms`),
      // so it sees neither links to them nor the headings that same-page links in blog posts target.
      plugins: [
        starlightLinksValidator({
          exclude: ({ file, link }) =>
            file.includes('/src/content/blog/') ||
            ['/typedoc/', '/blog/'].some((prefix) => link.startsWith(prefix)) ||
            ['/privacy', '/terms'].includes(link.split(/[?#]/)[0]),
        }),
      ],
    }),
  ],
});
