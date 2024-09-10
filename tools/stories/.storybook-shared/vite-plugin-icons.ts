// Required notice: Copyright (c) 2024, Will Shown <ch-ui@willshown.com>
// Based upon @tailwindcss/vite, fetched on 9 April 2024 from <https://github.com/tailwindlabs/tailwindcss/blob/next/packages/%40tailwindcss-vite/package.json>

import type { Plugin, ViteDevServer } from 'vite';
import { type BundleParams, makeSprite, scanString } from '@ch-ui/icons';
import pm from 'picomatch';
import fs from 'fs';

export default function vitePluginChUiIcons(params: BundleParams & { verbose?: boolean }): Plugin[] {
  const { symbolPattern, contentPaths } = params;

  const pms = contentPaths.map((contentPath) => pm(contentPath));
  const isContent = (id: string) => !!pms.find((pm) => pm(id));
  function shouldIgnore(id: string) {
    return !isContent(id);
  }

  let server: ViteDevServer | null = null;
  const detectedSymbols = new Set<string>();
  const visitedFiles = new Set<string>();
  const status = { updated: false };

  function scan(src: string) {
    let updated = false;
    const nextCandidates = scanString({ contentString: src, symbolPattern });
    Array.from(nextCandidates).forEach((candidate) => {
      if (!detectedSymbols.has(candidate)) {
        detectedSymbols.add(candidate);
        updated = true;
      }
    });

    return updated;
  }

  return [
    {
      // Step 1: Scan source files for detectedSymbols
      name: '@ch-ui/icons:scan',
      enforce: 'pre',

      configureServer(_server) {
        server = _server;

        // Process chunks.
        server.middlewares.use((req, res, next) => {
          const match = req.url?.match(/^\/@fs(.+)\.(\w+)$/);
          if (match) {
            const [, path, ext] = match;
            const filename = `${path}.${ext}`;
            if (ext === 'mjs') {
              // TODO(burdon): Check if matches contentPaths (note: different filename).
              if (!visitedFiles.has(filename) && path.indexOf('node_modules') === -1) {
                visitedFiles.add(filename);
                const src = fs.readFileSync(filename, 'utf-8');
                status.updated ||= scan(src);
              }
            }
          }
          next();
        });
      },

      transformIndexHtml(html) {
        status.updated ||= scan(html);
      },

      transform(src, id) {
        if (!shouldIgnore(id)) {
          status.updated ||= scan(src);
        }
      },
    },

    {
      // Step 2: Write sprite
      name: '@ch-ui/icons:write',
      enforce: 'post',

      async transform() {
        if (status.updated) {
          status.updated = false;
          await makeSprite(params, detectedSymbols);
          if (params.verbose) {
            console.log('sprite updated', detectedSymbols.size);
          }
        }
      },
    },
  ] satisfies Plugin[];
}
