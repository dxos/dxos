//
// Copyright 2026 DXOS.org
//

import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { type Plugin, defineConfig, searchForWorkspaceRoot } from 'vite';

import { ThemePlugin } from '@dxos/ui-theme/plugin';
import importSource from '@dxos/vite-plugin-import-source';

const dirname = import.meta.dirname;
const rootDir = searchForWorkspaceRoot(dirname);
const phosphor = path.join(rootDir, 'node_modules/@phosphor-icons/core/assets');

const ICONS_ID = 'virtual:autocue-icons';

/** Every `ph--<name>--<weight>` the player names, so its sprite carries those and nothing else. */
const usedIcons = (): string[] => {
  const sources = path.join(dirname, '../src/player');
  const names = new Set<string>();
  const scan = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(file);
      } else if (/\.tsx?$/.test(entry.name)) {
        for (const [name] of readFileSync(file, 'utf8').matchAll(/ph--[a-z0-9-]+--[a-z]+/g)) {
          names.add(name);
        }
      }
    }
  };
  scan(sources);
  // Icons the design system draws on its own (dialog close, list check, caret).
  ['ph--x--regular', 'ph--check--regular', 'ph--caret-down--bold'].forEach((name) => names.add(name));
  return [...names].sort();
};

/** Phosphor's files as `<symbol>`s, the shape the icon registry ingests from `/icons.svg`. */
const iconSprite = (): Plugin => ({
  name: 'autocue-icons',
  resolveId: (id) => (id === ICONS_ID ? `\0${ICONS_ID}` : undefined),
  load: (id) => {
    if (id !== `\0${ICONS_ID}`) {
      return undefined;
    }
    const symbols = usedIcons().map((icon) => {
      const [, name, weight] = icon.split('--');
      const file = path.join(phosphor, weight, `${name}${weight === 'regular' ? '' : `-${weight}`}.svg`);
      const svg = readFileSync(file, 'utf8');
      const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 256 256';
      const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      return `<symbol id="${icon}" viewBox="${viewBox}" fill="currentColor">${body}</symbol>`;
    });
    const sprite = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${symbols.join('')}</defs></svg>`;
    return `export default ${JSON.stringify(sprite)};`;
  },
});

/**
 * Folds the built script and stylesheet into `index.html`, so the player is one file that `pack.mjs` fills with a
 * manifest: an Artifact cannot load scripts from its own files, and an archive opened from disk cannot load modules.
 */
const singleFile = (): Plugin => ({
  name: 'autocue-single-file',
  enforce: 'post',
  generateBundle: (_options, bundle) => {
    const html = Object.values(bundle).find((asset) => asset.type === 'asset' && asset.fileName.endsWith('.html'));
    if (!html || html.type !== 'asset') {
      return;
    }
    let source = String(html.source);
    for (const [fileName, output] of Object.entries(bundle)) {
      if (output.type === 'chunk' && output.isEntry) {
        // `</script` inside the code would close the element early.
        const code = output.code.replaceAll('</script', '<\\/script');
        // At the end of the body, where it runs after the manifest is parsed, and where `pack.mjs` can find the shell
        // around it without searching the code.
        source = source
          .replace(new RegExp(`\\s*<script type="module" crossorigin src="[^"]*${fileName}"></script>`), '')
          .replace(/<\/body>(?![\s\S]*<\/body>)/, () => `<script type="module">${code}</script>\n  </body>`);
        delete bundle[fileName];
      } else if (output.type === 'asset' && fileName.endsWith('.css')) {
        source = source.replace(
          new RegExp(`<link rel="stylesheet" crossorigin href="[^"]*${fileName}">`),
          () => `<style>${String(output.source)}</style>`,
        );
        delete bundle[fileName];
      }
    }
    html.source = source;
  },
});

export default defineConfig({
  root: dirname,
  base: './',
  build: {
    outDir: path.join(dirname, '../dist/player'),
    emptyOutDir: true,
    target: ['chrome108', 'edge107', 'firefox104', 'safari16'],
    // One chunk: the page must be a single file.
    rollupOptions: { output: { codeSplitting: false } },
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    modulePreload: false,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
  resolve: {
    // Shared @dxos utilities import node builtins; the browser shims stand in, as in the apps.
    alias: [
      { find: /^(node:)?util$/, replacement: '@dxos/node-std/util' },
      { find: /^(node:)?crypto$/, replacement: '@dxos/node-std/crypto' },
    ],
  },
  plugins: [
    importSource({ include: ['@dxos/**', '#*'] }),
    react({ include: /\.[jt]sx$/, exclude: [/\/node_modules\//] }),
    iconSprite(),
    ThemePlugin({}),
    singleFile(),
  ],
});
