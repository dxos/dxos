//
// Copyright 2025 DXOS.org
//

import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';
import { type InlineConfig, createServer } from 'vite';
import { expect, test } from 'vitest';

// @ts-ignore: types for jsdom may not be installed in this package
import { log } from '@dxos/log';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname); // packages/apps/composer-app

// TODO(dmaretskyi): Flaky.
test.skip(
  'starts Vite dev server, fetches index.html, parses and recursively fetches scripts',
  { retry: 3, timeout: 20_000 },
  async () => {
    const config: InlineConfig = {
      configFile: join(projectRoot, 'vite.config.ts'),
      logLevel: 'info',
      server: {
        host: '127.0.0.1',
        port: 0, // choose a free port
        strictPort: false,
      },
    };

    const server = await createServer(config);
    try {
      await server.listen();

      const httpServer = server.httpServer;
      if (!httpServer) {
        throw new Error('Vite httpServer not available');
      }

      const { port } = httpServer.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${port}`;

      let files = 0;
      let bytes = 0;

      const res = await fetch(`${baseUrl}/index.html`);
      expect(res.status).toBe(200);
      const html = await res.text();
      files++;
      bytes += Number(res.headers.get('content-length'));

      // Basic sanity checks that we received HTML.
      expect(html).toMatch(/<!doctype html>/i);
      expect(html).toMatch(/<html/i);

      // Parse HTML and collect initial script/modulepreload urls.
      const dom = new JSDOM(html);
      const document = dom.window.document as Document;
      const resources = new Set<string>();

      // <script src="...">
      for (const script of Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'))) {
        const src = script.getAttribute('src');
        if (src) {
          resources.add(new URL(src, baseUrl).toString());
        }
      }
      // <link rel="modulepreload" href="...">
      for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"][href]'))) {
        const href = link.getAttribute('href');
        if (href) {
          resources.add(new URL(href, baseUrl).toString());
        }
      }

      // Recursively fetch resources and their imports.
      const visited = new Set<string>();

      const importRe =
        /\bimport\s*(?:[^'"()]*?from\s*)?['"]([^'"\n]+)['"];?|\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)|\bexport\s*[^'"()]*?from\s*['"]([^'"\n]+)['"]/g;
      const fetchAndRecurse = async (url: string) => {
        if (visited.has(url)) return;
        visited.add(url);
        console.log(url);

        const r = await fetch(url);
        if (r.status === 404) {
          return; // There's an issue with http://127.0.0.1:5173/node_modules/.vite/deps/MyComponent URL
        }
        if (!r.ok) {
          console.error('Failed to fetch', url, r.status, r.statusText);
          console.error(await r.text());
        }
        expect(r.ok).toBe(true);
        files++;
        bytes += Number(r.headers.get('content-length'));

        const contentType = r.headers.get('content-type') ?? '';
        if (
          contentType.includes('javascript') ||
          contentType.includes('text/plain') ||
          url.endsWith('.js') ||
          url.endsWith('.mjs')
        ) {
          const code = await r.text();
          // Find import specifiers.
          let m: RegExpExecArray | null;
          while ((m = importRe.exec(code))) {
            const spec = m[1] || m[2] || m[3];
            if (!spec) continue;
            // Ignore data: and http(s) external URLs.
            if (/^(data:|https?:)/i.test(spec)) continue;
            // Resolve relative and absolute paths against the current module URL.
            const resolved = new URL(spec, url).toString();
            await fetchAndRecurse(resolved);
          }
        } else if (contentType.includes('text/html')) {
          // Some entries may serve HTML wrappers; parse for scripts too.
          const page = await r.text();
          const pageDom = new JSDOM(page);
          for (const s of Array.from(pageDom.window.document.querySelectorAll<HTMLScriptElement>('script[src]'))) {
            const src = s.getAttribute('src');
            if (src) await fetchAndRecurse(new URL(src, url).toString());
          }
        } else {
          // For other assets (css, wasm, etc.), just ensure fetch succeeds.
          // No recursion needed.
        }
      };

      for (const u of resources) {
        await fetchAndRecurse(u);
      }

      log.info('files', { files, bytes });
    } finally {
      await server.close();
    }
  },
);
