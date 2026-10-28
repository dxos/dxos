//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test } from 'vitest';

import { type WorkingSetRow } from '@dxos/echo-client';

import { BOOT_CACHE_VERSION, BootCacheStore } from './boot-cache-store.ts';

const NAME = 'dxos-boot-cache-test';

const row: WorkingSetRow = { documentId: 'doc', heads: ['head'], bytes: new Uint8Array([1, 2, 3]) };

const write = async (store: BootCacheStore): Promise<void> =>
  store.write({
    streams: { 'SystemService.queryStatus:null': [{ status: 1 }] },
    spaces: new Map([['space', [row]]]),
    remove: [],
  });

describe('BootCacheStore', () => {
  const stores: BootCacheStore[] = [];
  const open = (version = BOOT_CACHE_VERSION): BootCacheStore => {
    const store = new BootCacheStore({ name: NAME, version });
    stores.push(store);
    return store;
  };

  afterEach(async () => {
    stores.splice(0).forEach((store) => store.close());
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  });

  test('reads back what it wrote', async ({ expect }) => {
    const store = open();
    await write(store);
    const snapshot = await store.read();
    expect(snapshot?.streams['SystemService.queryStatus:null']).toEqual([{ status: 1 }]);
    expect(snapshot?.spaces.get('space')?.[0].bytes).toEqual(row.bytes);
  });

  test('a newer version discards what an older one wrote', async ({ expect }) => {
    const older = open(1);
    await write(older);
    older.close();
    expect(await open(2).read()).toBeUndefined();
  });

  test('an older version discards what a newer one wrote', async ({ expect }) => {
    const newer = open(3);
    await write(newer);
    newer.close();
    const older = open(2);
    expect(await older.read()).toBeUndefined();
    await write(older);
    expect((await older.read())?.spaces.get('space')).toHaveLength(1);
  });
});
