//
// Copyright 2026 DXOS.org
//

import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { type Plugin, defineConfig, searchForWorkspaceRoot } from 'vite';

import { ThemePlugin } from '@dxos/ui-theme/plugin';
import importSource from '@dxos/vite-plugin-import-source';

const dirname = import.meta.dirname;
const rootDir = searchForWorkspaceRoot(dirname);
const phosphor = path.join(rootDir, 'node_modules/@phosphor-icons/core/assets');

const ICONS_ID = 'virtual:session-board-icons';

const ICON_PATTERN = /ph--[a-z0-9-]+--(?:regular|bold|fill|light|thin|duotone)/g;
const SPRITE_PLACEHOLDER = '__SESSION_BOARD_ICON_SPRITE__';

/** A Phosphor file as a `<symbol>`, the shape the icon registry ingests from `/icons.svg`; undefined if none exists. */
const symbolFor = (icon: string): string | undefined => {
  const [, name, weight] = icon.split('--');
  const file = path.join(phosphor, weight, `${name}${weight === 'regular' ? '' : `-${weight}`}.svg`);
  if (!existsSync(file)) {
    return undefined;
  }
  const svg = readFileSync(file, 'utf8');
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 256 256';
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<symbol id="${icon}" viewBox="${viewBox}" fill="currentColor">${body}</symbol>`;
};

/**
 * The sprite of every icon named in a module that reaches the bundle, the design system's own included (a Select's
 * caret, a dialog's close), so none falls back to fetching `/phosphor/…` from a host that has no such path.
 */
const iconSprite = (): Plugin => {
  const names = new Set<string>();
  return {
    name: 'session-board-icons',
    resolveId: (id) => (id === ICONS_ID ? `\0${ICONS_ID}` : undefined),
    load: (id) => (id === `\0${ICONS_ID}` ? `export default ${JSON.stringify(SPRITE_PLACEHOLDER)};` : undefined),
    transform: (code) => {
      for (const [name] of code.matchAll(ICON_PATTERN)) {
        names.add(name);
      }
      return undefined;
    },
    // Every module has been transformed by now, so the sprite is complete.
    renderChunk: (code) => {
      const symbols = [...names].sort().flatMap((icon) => symbolFor(icon) ?? []);
      const sprite = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${symbols.join('')}</defs></svg>`;
      return code.replace(new RegExp(`(["'])${SPRITE_PLACEHOLDER}\\1`), () => JSON.stringify(sprite));
    },
  };
};

/** Whether a character code is one the Artifact publisher refuses in a page: U+FFFD, or a control byte besides tab, LF and CR. */
const isUnsafe = (code: number) => code === 0xfffd || (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d);

/** Rewrites refused characters as `\\uXXXX`, which means the same character inside the bundle's strings and regexes. */
const escapeUnsafe = (code: string): string => {
  let result = '';
  for (const char of code) {
    const point = char.charCodeAt(0);
    result += isUnsafe(point) ? `\\u${point.toString(16).padStart(4, '0')}` : char;
  }
  return result;
};

/**
 * Folds the built script and stylesheet into `index.html`, so the page that `cli.ts build` fills with the board is one
 * file to publish.
 */
const singleFile = (): Plugin => ({
  name: 'session-board-single-file',
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
        // `</script` inside the code would close the element early.
        const code = escapeUnsafe(output.code.replaceAll('</script', '<\\/script'));
        // At the end of the body, where it runs after the board data is parsed.
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
    outDir: path.join(dirname, '../dist/app'),
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
