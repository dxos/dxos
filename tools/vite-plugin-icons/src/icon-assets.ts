//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'fs';
import { cp } from 'fs/promises';
import { join, resolve } from 'path';
import type { Plugin } from 'vite';

export type IconAssets = {
  /** Public route prefix the catalog is served under, e.g. `/phosphor`. */
  route: string;
  /** Directory containing the icon-set catalog, e.g. `node_modules/@phosphor-icons/core/assets`. */
  dir: string;
  /**
   * Copy the catalog into the build output (default `true`). `false` serves it from the dev server
   * only — for a host whose dev sprite can trail the modules it serves but whose builds must not
   * carry thousands of files.
   */
  copy?: boolean;
};

/**
 * Serves an icon-set catalog as individual SVGs under `{route}/...`, so runtime icon
 * resolvers (e.g. @dxos/react-ui's IconRegistry) can fetch glyphs that weren't statically
 * referenced — icons used only by runtime-loaded plugins.
 *
 * In dev: middleware streams from `dir`. In build: assets are copied into the output dir unless `copy` is false.
 */
export const iconAssetsPlugin = ({ route, dir, copy = true }: IconAssets): Plugin => {
  let outDir: string | undefined;
  return {
    name: `dxos:icon-assets${route}`,
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
        const filePath = join(dir, rawPath);
        if (!filePath.startsWith(dir) || !existsSync(filePath)) {
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
      if (!copy || !outDir || !existsSync(dir)) {
        return;
      }
      const dest = join(outDir, route.replace(/^\//, ''));
      await cp(dir, dest, { recursive: true });
    },
  };
};
