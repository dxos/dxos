//
// Copyright 2026 DXOS.org
//

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'vitest';

import { startTelemetrySink } from './telemetry-sink.ts';

const freePort = (): Promise<number> =>
  new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address && typeof address !== 'string' ? address.port : 0));
    });
  });

describe('telemetry sink', () => {
  test('answers the SDK as PostHog would and counts what it sends', async ({ expect }) => {
    const assets = mkdtempSync(path.join(tmpdir(), 'posthog-assets-'));
    writeFileSync(path.join(assets, 'lazy-recorder.js'), '/* recorder */');
    const sink = await startTelemetrySink({ port: await freePort(), posthogAssets: assets });
    const origin = `http://127.0.0.1:${sink.port}`;
    try {
      const config = await (await fetch(`${origin}/array/phc_test/config`)).json();
      expect(config.sessionRecording.endpoint).toBe('/s/');
      expect(config.autocaptureExceptions).toBe(true);
      expect(await (await fetch(`${origin}/static/lazy-recorder.js?v=1`)).text()).toBe('/* recorder */');
      expect((await fetch(`${origin}/static/missing.js`)).status).toBe(404);
      expect((await fetch(`${origin}/s/`, { method: 'OPTIONS' })).status).toBe(204);
      await fetch(`${origin}/s/?compression=gzip-js`, { method: 'POST', body: 'x'.repeat(1000) });
      await fetch(`${origin}/api/otel/v1/logs`, { method: 'POST', body: 'y'.repeat(10) });
      expect(sink.traffic()).toMatchObject({
        '/array/:token/config': { requests: 1, bytes: 0 },
        '/s/': { requests: 1, bytes: 1000 },
        '/api/otel/v1/logs': { requests: 1, bytes: 10 },
      });
    } finally {
      await sink.close();
      rmSync(assets, { recursive: true, force: true });
    }
  });
});
