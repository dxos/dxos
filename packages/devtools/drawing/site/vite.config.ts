//
// Copyright 2026 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Plugin, defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

import PluginImportSource from '@dxos/vite-plugin-import-source';

import { HERO, fileName } from './src/markup.ts';
import { type Prerendered, prerender } from './src/prerender.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Fills the page's `{{...}}` slots with engine output and serves the hero's `.dx.svg` beside it. */
const PrerenderPlugin = (): Plugin => {
  let prerendered: Promise<Prerendered> | undefined;
  const load = () => (prerendered ??= prerender(path.join(dirname, 'diagrams')));
  return {
    name: 'drawing-sh:prerender',
    transformIndexHtml: {
      order: 'pre',
      handler: async (html) => {
        const { slots } = await load();
        return Object.entries(slots).reduce((page, [slot, value]) => page.replace(slot, value), html);
      },
    },
    configureServer: (server) => {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== `/${fileName(HERO)}`) {
          return next();
        }
        try {
          const { file } = await load();
          response.setHeader('Content-Type', 'image/svg+xml');
          response.end(file.svg);
        } catch (error) {
          // Connect drops a rejected async middleware, so the request would hang; retry the prerender next time.
          prerendered = undefined;
          next(error);
        }
      });
    },
    handleHotUpdate: ({ file }) => {
      if (file.endsWith('.dx')) {
        prerendered = undefined;
      }
    },
    generateBundle: async function (_, bundle) {
      const { file } = await load();
      this.emitFile({ type: 'asset', fileName: file.fileName, source: file.svg });
      // A tree-shaken dependency still emits its wasm (automerge's, from the editor stack); nothing loads it.
      const code = Object.values(bundle).flatMap((output) => (output.type === 'chunk' ? [output.code] : []));
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type === 'asset' && fileName.endsWith('.wasm')) {
          const name = path.basename(fileName);
          if (!code.some((source) => source.includes(name))) {
            delete bundle[fileName];
          }
        }
      }
    },
  };
};

// The page is static HTML plus one lazy island (the editor), so Vite builds it as a plain multi-asset site.
export default defineConfig({
  root: dirname,
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 2048,
  },
  // Dev serves the editor stack unshaken, so Automerge's wasm loads there and must be instantiated, not pre-bundled.
  optimizeDeps: {
    exclude: ['@automerge/automerge', '@automerge/automerge-subduction'],
  },
  resolve: {
    // `@dxos/util` imports `node:util` at module scope; dev serves that module unshaken, so the browser needs a shim.
    alias: [{ find: /^(node:)?util$/, replacement: '@dxos/node-std/util' }],
  },
  // Workspace packages build from source: their per-module files tree-shake far better than a bundled `dist/lib`.
  plugins: [PrerenderPlugin(), PluginImportSource({ include: ['@dxos/**'] }), wasm(), ReactPlugin()],
});
