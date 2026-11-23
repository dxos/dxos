//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { AppManager } from './app-manager.ts';

/** Built by `composer-e2e:build-remote-plugin`. */
const DIST = join(import.meta.dirname, '../../__fixtures__/remote-plugin/dist');

/** Another origin, as a published plugin's is; served from {@link DIST} by a route, not a server. */
const ORIGIN = 'https://e2e-remote-plugin.test';

const CONTENT_TYPES: Record<string, string> = { '.json': 'application/json', '.mjs': 'text/javascript' };

test.describe('Remote plugin', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.close();
  });

  test('loads a plugin from its manifest and runs its operation', { tag: ['@QA-17'] }, async () => {
    const requested: string[] = [];
    await host.page.route(`${ORIGIN}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname.slice(1);
      requested.push(path);
      const body = await readFile(join(DIST, path)).catch(() => undefined);
      await route.fulfill(
        body === undefined
          ? { status: 404 }
          : {
              body,
              contentType: CONTENT_TYPES[extname(path)] ?? 'application/octet-stream',
              // A module script from another origin loads only with CORS.
              headers: { 'access-control-allow-origin': '*' },
            },
      );
    });

    const invoke = (key: string, input: unknown) =>
      host.page.evaluate(
        async ([key, input]) => {
          const invoke = globalThis.composer?.invoke;
          if (!invoke) {
            throw new Error('composer.invoke is not mounted');
          }
          return invoke(key, input);
        },
        [key, input] as const,
      );

    expect(await invoke('org.dxos.operation.registry.loadPlugin', { url: `${ORIGIN}/manifest.json` })).toMatchObject({
      id: 'org.dxos.plugin.e2eRemote',
    });
    expect(await invoke('org.dxos.operation.e2eRemotePlugin.getEcho', { text: 'hello' })).toEqual({
      text: 'hello',
      from: 'e2e-remote-plugin',
    });

    expect(requested).toContain('manifest.json');
    expect(requested.some((path) => path.startsWith('operation-handler-'))).toBe(true);
    expect(requested).not.toContain('index.mjs');
  });
});
