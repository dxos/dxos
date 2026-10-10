//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { clearCaches, clearIndexedDB, clearOPFS, clearServiceWorkers } from './browser-storage.ts';

// Node has none of these APIs, like a WKWebView on a custom scheme has no service workers.
describe('browser storage cleanup', () => {
  test.for([
    ['clearCaches', clearCaches],
    ['clearIndexedDB', clearIndexedDB],
    ['clearOPFS', clearOPFS],
    ['clearServiceWorkers', clearServiceWorkers],
  ] as const)('%s resolves where its API is absent', async ([, clear], { expect }) => {
    await expect(clear()).resolves.toBeUndefined();
  });
});
