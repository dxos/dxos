//
// Copyright 2026 DXOS.org
//

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { type Plugin } from 'vite';
import wasm from 'vite-plugin-wasm';

import importSource from '@dxos/vite-plugin-import-source';
import { DxosLogPlugin } from '@dxos/vite-plugin-log';

import { dxGrammar } from './site/util/dx-grammar.ts';
import { SITE_DIR } from './src/functions/site.ts';

const browserTargets = ['chrome108', 'edge107', 'firefox104', 'safari16'];

/** Node builtins the `@dxos/*` sources import, shimmed for the browser only: the prerender needs the real ones. */
const browserNodeStd = (): Plugin => ({
  name: 'drawing-site:browser-node-std',
  enforce: 'pre',
  applyToEnvironment: (environment) => environment.name === 'client',
  resolveId(id, importer) {
    const name = /^(?:node:)?(util|path|crypto|stream)$/.exec(id)?.[1];
    return name ? this.resolve(`@dxos/node-std/${name}`, importer, { skipSelf: true }) : undefined;
  },
});

/** Astro's client build targets `esnext`; the editor's chunks keep the app's browser targets. */
const browserBuildTarget = (): Plugin => ({
  name: 'drawing-site:browser-build-target',
  configEnvironment: (name) => (name === 'client' ? { build: { target: browserTargets } } : undefined),
});

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Martian+Mono:wght@400;500&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap';

/**
 * The drawing.sh site (spec F-13.2): the home page and the docs. It builds into a folder of the app's build output,
 * which the Worker serves on a landing host (F-13.3).
 */
export default defineConfig({
  site: 'https://drawing.sh',
  srcDir: './site',
  publicDir: './site/public',
  outDir: `./out/drawing-app${SITE_DIR}`,
  integrations: [
    starlight({
      title: 'drawing.sh',
      description: 'Diagrams your agent can draw: a few lines of text, laid out into an SVG.',
      favicon: '/landing-icon.svg',
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        { tag: 'link', attrs: { rel: 'stylesheet', href: GOOGLE_FONTS } },
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/dxos/dxos/tree/main/packages/devtools/drawing' },
      ],
      expressiveCode: { shiki: { langs: [dxGrammar] } },
      customCss: ['./site/styles/tokens.css', './site/styles/editor.css', './site/styles/starlight.css'],
      components: {
        SocialIcons: './site/components/SocialIcons.astro',
      },
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Introduction', link: '/docs/' },
            { label: 'The app', link: '/docs/app/' },
            { label: 'The agent skill', link: '/docs/agent-skill/' },
            { label: 'The CLI', link: '/docs/cli/' },
          ],
        },
        {
          label: 'Language reference',
          items: [
            { label: 'Nodes, groups and edges', link: '/docs/language/' },
            { label: 'Relations', link: '/docs/language/relations/' },
            { label: 'Layout hints', link: '/docs/language/hints/' },
          ],
        },
        {
          label: 'Files and sharing',
          items: [
            { label: 'The .dx.svg file', link: '/docs/files/' },
            { label: 'Links and the share API', link: '/docs/sharing/' },
          ],
        },
      ],
    }),
  ],
  vite: {
    // The editor's scripts are shared with the app's Vite build, which reads `VITE_DRAWING_APP_URL`.
    envPrefix: ['PUBLIC_', 'VITE_'],
    // Apart from the app's dev server, which shares this package: one optimizer cache would invalidate the other's.
    cacheDir: 'node_modules/.vite-site',
    // As in the app's config: the editor's dependencies reach Automerge, whose wasm the optimizer must not bundle.
    optimizeDeps: { exclude: ['@automerge/automerge', '@automerge/automerge-subduction'] },
    plugins: [
      importSource({ include: ['@dxos/**', '#*'] }),
      browserNodeStd(),
      browserBuildTarget(),
      DxosLogPlugin(),
      wasm(),
    ],
  },
});
