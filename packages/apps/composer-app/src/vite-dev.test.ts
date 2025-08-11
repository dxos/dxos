//
// Copyright 2025 DXOS.org
//

import 'isomorphic-fetch';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer, type InlineConfig } from 'vite';
import { expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname); // packages/apps/composer-app

test(
  'starts Vite dev server and fetches index.html',
  async () => {
    const config: InlineConfig = {
      configFile: join(projectRoot, 'vite.config.ts'),
      logLevel: 'error',
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

      const res = await fetch(`${baseUrl}/index.html`);
      expect(res.status).toBe(200);
      const html = await res.text();

      // Basic sanity checks that we received HTML.
      expect(html).toMatch(/<!doctype html>/i);
      expect(html).toMatch(/<html/i);
    } finally {
      await server.close();
    }
  },
  60_000,
);

