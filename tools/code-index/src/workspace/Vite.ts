//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import react from '@vitejs/plugin-react';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { type Plugin, type ViteDevServer, createServer } from 'vite';
import solid from 'vite-plugin-solid';
import wasm from 'vite-plugin-wasm';

import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';
import PluginImportSource from '@dxos/vite-plugin-import-source';

/**
 * Vite, in this process, in middleware mode. Nothing about the web UI is built ahead of time: the
 * server transforms `webui/` on request straight from the working tree, and resolves every
 * `@dxos/*` import through its `source` condition, so a change to a workspace package is live on
 * the next reload without building that package either.
 *
 * `middlewareMode` means Vite creates no listener of its own; the caller owns the port and routes
 * the RPC endpoint away before Vite ever sees the request.
 */

export class ViteError extends Data.TaggedError('code-index/ViteError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type Middleware = {
  /** Handles one request; the SPA fallback is applied here rather than by Vite. */
  readonly handle: (request: IncomingMessage, response: ServerResponse) => void;
  readonly server: ViteDevServer;
};

export type Options = {
  /** Directory holding `index.html` and the UI source. */
  readonly appRoot: string;
  /** The repository being indexed — Vite must be allowed to serve workspace sources from it. */
  readonly repoRoot: string;
  /** Where the pre-bundled dependencies go; kept beside the index rather than in the source tree. */
  readonly cacheDir: string;
};

/**
 * The `node:*` modules `@dxos/node-std` shims for the browser. Anything else — `node:child_process`
 * and friends — stays externalized, which is correct: no UI code should reach it.
 */
const NODE_STD = ['assert', 'buffer', 'crypto', 'events', 'fs', 'fs/promises', 'path', 'process', 'stream', 'util'];

/**
 * Redirects those imports to their browser shims. Workspace packages are served as source here, so
 * their `node:util` imports arrive unrewritten — where a build would have applied this same mapping.
 */
const nodeStdPlugin = (): Plugin => ({
  name: 'code-index:node-std',
  enforce: 'pre',
  resolveId: {
    order: 'pre',
    handler(source, importer, options) {
      const bare = source.startsWith('node:') ? source.slice('node:'.length) : source;
      return NODE_STD.includes(bare) ? this.resolve(`@dxos/node-std/${bare}`, importer, options) : undefined;
    },
  },
});

/** Opens the dev server for the enclosing scope. */
export const middleware = ({
  appRoot,
  repoRoot,
  cacheDir,
}: Options): Effect.Effect<Middleware, ViteError, Scope.Scope> =>
  Effect.gen(function* () {
    const server = yield* Effect.acquireRelease(
      Effect.tryPromise({
        catch: (cause) => new ViteError({ message: 'Cannot start Vite', cause }),
        try: () =>
          createServer({
            root: appRoot,
            cacheDir,
            configFile: false,
            envDir: false,
            appType: 'custom',
            server: {
              middlewareMode: true,
              // The UI imports TypeScript out of the workspace, which is outside `root`, so both
              // trees are allowed explicitly. `strict` stays on: turning it off does not widen the
              // allow list, it removes it, and `/@fs/<absolute path>` would then serve any file the
              // process can read.
              fs: { allow: [appRoot, repoRoot] },
            },
            // The UI is Solid, except for the chat thread, which is the repository's own React
            // component. `vite-plugin-solid` must therefore be scoped to the Solid half — left
            // unscoped it rewrites JSX in every React file it sees and the thread never renders.
            plugins: [
              nodeStdPlugin(),
              // `automerge.wasm?url` has to become a real served URL for the explicit init.
              wasm(),
              solid({ include: ['**/webui/**/*.tsx'], exclude: ['**/webui/react/**'] }),
              react({ include: ['**/webui/react/**/*.tsx', '**/packages/**/*.tsx'] }),
              PluginImportSource({ include: ['@dxos/**', '#*'] }),
              // `@dxos/react-ui`'s `Icon` reads glyphs out of a sprite this plugin builds; without
              // it every icon in the thread renders as an empty box.
              IconsPlugin({
                symbolPattern: iconSymbolPattern({ sets: ['ph', 'dx', 'px'], regularOnly: ['dx', 'px'] }),
                assetPath: (iconSet, name, variant) =>
                  iconSet === 'dx'
                    ? join(repoRoot, 'packages/ui/brand/assets/icons', `${name}.svg`)
                    : iconSet === 'px'
                      ? join(repoRoot, 'packages/ui/ui-icons/assets', `${name}.svg`)
                      : join(
                          repoRoot,
                          'node_modules/@phosphor-icons/core/assets',
                          variant,
                          `${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
                        ),
                spriteFile: 'icons.svg',
                contentPaths: [join(repoRoot, '{packages,tools}/**/src/**/*.{ts,tsx,css}')],
              }),
              // Tailwind plus the design tokens the thread's classes resolve against. Its own
              // `@source` globs already cover `packages/**` and `tools/**`, so the UI here and the
              // component it embeds are scanned together.
              ThemePlugin({}),
            ],
            resolve: {
              // One React and one Solid in the graph. The thread's transitive `@dxos/*` deps each
              // resolve their own copy otherwise, and two Reacts break hooks at runtime.
              dedupe: ['react', 'react-dom', 'solid-js'],
            },
            optimizeDeps: {
              /**
               * The thread reaches a long tail of CommonJS packages through its `@dxos/*` deps, and
               * a browser import of one fails until it has been converted — so discovery stays on
               * and finds them, and this list is only the seed that spares the first load a
               * re-optimize-and-reload for each. `react-dom/client` is the one that must be here:
               * it is the very first import, before any scan has run.
               */
              include: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
              entries: [join(appRoot, 'main.tsx')],
              /**
               * The two wasm packages must not be pre-bundled: esbuild rewrites their wasm-bindgen
               * glue and its memory is never initialized, which surfaces as a missing
               * `__wbindgen_externrefs`. Served as source they evaluate inert (`slim`) and
               * `vite-plugin-wasm` turns the `.wasm` import into a URL for the explicit init.
               *
               * `automerge-repo` is deliberately NOT excluded: it does no wasm work itself, and
               * pre-bundling it is what converts the CommonJS packages it depends on. Its own
               * automerge imports are externalized out of that chunk and land back here.
               */
              exclude: ['@automerge/automerge', '@automerge/automerge-subduction'],
            },
            logLevel: 'warn',
          }),
      }),
      (server) => Effect.promise(() => server.close()),
    );

    const template = join(appRoot, 'index.html');

    /**
     * Vite in `custom` app type serves no HTML, so the SPA fallback is ours: any request that its
     * middlewares did not answer gets `index.html`, which is what makes `/p/<project>` a URL the
     * user can reload.
     */
    const handle: Middleware['handle'] = (request, response) => {
      server.middlewares(request, response, () => {
        void (async () => {
          try {
            const html = await server.transformIndexHtml(request.url ?? '/', await readFile(template, 'utf8'));
            response.writeHead(200, { 'content-type': 'text/html' }).end(html);
          } catch (error) {
            server.ssrFixStacktrace(error as Error);
            response.writeHead(500, { 'content-type': 'text/plain' }).end(String(error));
          }
        })();
      });
    };

    return { handle, server };
  });
