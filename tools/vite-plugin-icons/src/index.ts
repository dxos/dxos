//
// Copyright 2024 DXOS.org
// Copyright 2024 Will Shown <ch-ui@willshown.com>
// Based upon @tailwindcss/vite, fetched on 9 April 2024 from <https://github.com/tailwindlabs/tailwindcss/blob/next/packages/%40tailwindcss-vite/package.json>
//

// TODO(burdon): Replace with https://github.com/vnphanquang/phosphor-icons-tailwindcss

import { type BundleParams, makeSprite, scanString } from '@ch-ui/icons';
import fs from 'fs';
import { join, resolve } from 'path';
import picomatch from 'picomatch';
import type { Plugin, ViteDevServer } from 'vite';

export type IconsPluginParams = Omit<BundleParams, 'spritePath'> & { spriteFile: string; verbose?: boolean };

export const IconsPlugin = ({
  assetPath,
  symbolPattern,
  spriteFile,
  contentPaths,
  config,
  verbose,
}: IconsPluginParams): Plugin[] => {
  const pms = contentPaths.map((contentPath) => picomatch(contentPath));
  const isContent = (filepath: string) => !!pms.find((pm) => pm(filepath));
  const shouldIgnore = (filepath: string) => !isContent(filepath);

  const detectedSymbols = new Set<string>();
  const scan = (contentString: string) => {
    let updated = false;
    Array.from(scanString({ contentString, symbolPattern })).forEach((candidate) => {
      if (!detectedSymbols.has(candidate)) {
        detectedSymbols.add(candidate);
        updated = true;
      }
    });

    return updated;
  };

  const visitedFiles = new Set<string>();
  const status = { updated: false };

  let rootDir: string;
  let spritePath: string;
  let server: ViteDevServer | null = null;

  // Coalesce sprite writes during dev startup. Without this, every transform
  // that detects a new icon symbol triggers a full `makeSprite()` write to
  // disk; that file lives under publicDir, which fires CSS HMR for every
  // stylesheet referencing it. During a cold-start with many lazy-loaded
  // packages, dozens of new icons are discovered in tight bursts as plugin
  // sources stream through — leading to a "main.css HMR storm" (40+ updates
  // in 1-2 s) and growing esbuild deps-bundle pass times because CSS HMR
  // work contends with the deps optimizer. Coalescing collapses N "new
  // icon" detections in the same idle window into a single write.
  //
  // Also skip the write when the symbol set hasn't actually grown beyond
  // what's already on disk — a cheap guard against repeating the work
  // when the same icons get re-detected after a reload.
  let writeTimer: NodeJS.Timeout | null = null;
  let lastWrittenSize = 0;
  const writeDebounceMs = Number(process.env.DX_ICONS_DEBOUNCE_MS) || 200;

  return [
    {
      // Step 1: Scan source files incrementally.
      name: '@ch-ui/icons:scan',
      enforce: 'pre',

      configResolved: (config) => {
        rootDir = resolve(config.root);
        spritePath = resolve(config.publicDir, spriteFile);
      },

      configureServer: (_server) => {
        server = _server;

        // Process chunks.
        server.middlewares.use((req, res, next) => {
          if (req.url?.indexOf('/virtual:') === -1) {
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
                    const match = scan(src);
                    status.updated ||= match;
                  } catch {
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
      transform: () => {
        if (!status.updated) {
          return;
        }
        status.updated = false;
        // Debounce: every flip of `status.updated` resets the timer; only
        // when no new icon has been detected for `writeDebounceMs` does the
        // write actually happen. Bursts during cold-start collapse into one
        // write instead of N.
        if (writeTimer) {
          clearTimeout(writeTimer);
        }
        writeTimer = setTimeout(async () => {
          writeTimer = null;
          if (detectedSymbols.size === lastWrittenSize) {
            // Same set as last write — skip. (Possible after a browser
            // reload re-runs scanning over already-known modules.)
            return;
          }
          lastWrittenSize = detectedSymbols.size;
          await makeSprite({ assetPath, symbolPattern, spritePath, contentPaths, config }, detectedSymbols);
          if (verbose) {
            const symbols = Array.from(detectedSymbols.values());
            symbols.sort();
            console.log(
              'Sprite updated:',
              JSON.stringify({ path: spritePath, size: detectedSymbols.size, symbols }, null, 2),
            );
          }
        }, writeDebounceMs);
      },
      // Force a final write at build close so production builds aren't
      // missing icons that were detected during the very last transforms.
      buildEnd: async () => {
        if (writeTimer) {
          clearTimeout(writeTimer);
          writeTimer = null;
        }
        if (detectedSymbols.size !== lastWrittenSize) {
          lastWrittenSize = detectedSymbols.size;
          await makeSprite({ assetPath, symbolPattern, spritePath, contentPaths, config }, detectedSymbols);
        }
      },
    },
  ] satisfies Plugin[];
};
