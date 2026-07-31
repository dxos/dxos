//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'fs';
import { cp } from 'fs/promises';
import { join, resolve } from 'path';
import type { Plugin } from 'vite';

export type PhosphorAssetsPluginParams = {
  /** Directory containing the Phosphor catalog, e.g. `node_modules/@phosphor-icons/core/assets`. */
  assetsDir: string;
  /** Public route prefix the catalog is served under. */
  route?: string;
};

/**
 * Serves the full Phosphor icon catalog as individual SVGs under `{route}/{weight}/{name}.svg`,
 * so the runtime icon resolver in @dxos/react-ui can fetch glyphs that weren't statically
 * referenced (e.g. icons used only by runtime-loaded plugins).
 *
 * In dev: middleware streams from `assetsDir`. In build: assets are copied into the output dir.
 */
export const PhosphorAssetsPlugin = ({ assetsDir, route = '/phosphor' }: PhosphorAssetsPluginParams): Plugin => {
  let outDir: string | undefined;
  return {
    name: 'dxos:phosphor-assets',
    configResolved: (config) => {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer: (server) => {
      server.middlewares.use(route, (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          return next();
        }
        const rawPath = (req.url ?? '').split('?')[0];
        if (rawPath.includes('..')) {
          res.statusCode = 400;
          res.end();
          return;
        }
        const filePath = join(assetsDir, rawPath);
        if (!filePath.startsWith(assetsDir) || !existsSync(filePath)) {
          return next();
        }
        try {
          const content = readFileSync(filePath);
          res.setHeader('Content-Type', 'image/svg+xml');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.end(content);
        } catch {
          next();
        }
      });
    },
    closeBundle: async () => {
      if (!outDir || !existsSync(assetsDir)) {
        return;
      }
      const dest = join(outDir, route.replace(/^\//, ''));
      await cp(assetsDir, dest, { recursive: true });
    },
  };
};
