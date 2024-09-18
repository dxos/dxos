//
// Copyright 2024 Will Shown <ch-ui@willshown.com>
// Copyright 2024 DXOS.org
// Based upon @tailwindcss/vite, fetched on 9 April 2024 from <https://github.com/tailwindlabs/tailwindcss/blob/next/packages/%40tailwindcss-vite/package.json>
//

import { type BundleParams, makeSprite, scanString } from '@ch-ui/icons';
import fs from 'fs';
import { dirname, join, resolve } from 'path';
import picomatch from 'picomatch';
import type { Plugin, ViteDevServer } from 'vite';

export const IconsPlugin = (params: BundleParams & { manifestPath?: string; verbose?: boolean }): Plugin[] => {
  const { manifestPath, spritePath, symbolPattern, contentPaths, verbose } = params;

  const pms = contentPaths.map((contentPath) => picomatch(contentPath));
  const isContent = (filepath: string) => !!pms.find((pm) => pm(filepath));
  const shouldIgnore = (filepath: string) => !isContent(filepath);

  let rootDir: string;
  let server: ViteDevServer | null = null;
  const detectedSymbols = new Set<string>();
  const visitedFiles = new Set<string>();
  const status = { updated: false };

  const scan = (src: string) => {
    let updated = false;
    const nextCandidates = scanString({ contentString: src, symbolPattern });
    Array.from(nextCandidates).forEach((candidate) => {
      if (!detectedSymbols.has(candidate)) {
        detectedSymbols.add(candidate);
        updated = true;
      }
    });

    return updated;
  };

  const readManifest = (filepath: string) => {
    if (fs.existsSync(filepath)) {
      const icons = fs.readFileSync(filepath, { encoding: 'utf8' }).toString();
      detectedSymbols.clear();
      JSON.parse(icons).forEach((icon: string) => detectedSymbols.add(icon));
      if (verbose) {
        // eslint-disable-next-line no-console
        console.log('Cached icons:', detectedSymbols.size);
      }
    }
  };

  const writeManifest = (filepath: string) => {
    const baseDir = dirname(filepath);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    if (verbose) {
      // eslint-disable-next-line no-console
      console.log('Writing manifest:', JSON.stringify({ path: filepath, size: detectedSymbols.size }));
    }
    const symbols = Array.from(detectedSymbols.values());
    symbols.sort();
    fs.writeFileSync(filepath, JSON.stringify(symbols, null, 2), { encoding: 'utf8' });
  };

  return [
    {
      // Step 1: Scan source files incrementally.
      name: '@ch-ui/icons:scan',
      enforce: 'pre',

      configResolved: (config) => {
        rootDir = resolve(config.root);
        if (manifestPath) {
          readManifest(manifestPath);
        }
      },

      configureServer: (_server) => {
        server = _server;

        // Process chunks.
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/virtual:')) {
            const match = req.url?.match(/^(\/@fs)?(.+)\.(\w+)$/);
            if (match) {
              const [, prefix, path, ext] = match;
              const filename = join((prefix ? '' : rootDir) + `${path}.${ext}`);
              if (!visitedFiles.has(filename)) {
                visitedFiles.add(filename);
                // TODO(burdon): Check if matches contentPaths (incl. mjs).
                const extensions = ['js', 'ts', 'jsx', 'tsx', 'mjs'];
                if (extensions.some((e) => e === ext) && path.indexOf('node_modules') === -1) {
                  try {
                    const src = fs.readFileSync(filename, 'utf8');
                    status.updated ||= scan(src);
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Missing file', req.url);
                  }
                }
              }
            }
          }

          next();
        });
      },

      transformIndexHtml: (html) => {
        const match = scan(html);
        status.updated ||= match;
      },

      transform: (src, id) => {
        if (!shouldIgnore(id)) {
          const match = scan(src);
          status.updated ||= match;
        }
      },
    },
    {
      // Step 2: Write sprite.
      // NOTE: This must run before the public directory is copied.
      name: '@ch-ui/icons:write',
      enforce: 'post',

      transform: async () => {
        if (status.updated) {
          status.updated = false;
          await makeSprite(params, detectedSymbols);
          if (manifestPath) {
            writeManifest(manifestPath);
          }

          if (verbose) {
            const symbols = Array.from(detectedSymbols.values());
            symbols.sort();
            // eslint-disable-next-line no-console
            console.log(
              'Sprite updated:',
              JSON.stringify({ path: spritePath, size: detectedSymbols.size, symbols }, null, 2),
            );
          }
        }
      },
    },
  ] as Plugin[];
};
