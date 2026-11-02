//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { type ClientServicesProvider, makeDeferredClientServicesRpc } from '@dxos/client-protocol';
import { type WorkingSetRow } from '@dxos/echo-client';

import { BootCacheServices, type WorkingSetSource } from './boot-cache-services.ts';
import { BootCacheStore } from './boot-cache-store.ts';

const row: WorkingSetRow = { documentId: 'doc', heads: ['head'], bytes: new Uint8Array([1, 2, 3]) };
const space: WorkingSetSource = { id: 'space', exportWorkingSet: () => [row] };

/** A provider whose services open when `opened` resolves; none of its calls are reached. */
const provider = (opened: Promise<void>): ClientServicesProvider => {
  const rpc = makeDeferredClientServicesRpc(Effect.never);
  return { closed: new Event(), rpc, services: {}, open: () => opened, close: async () => {} };
};

describe('BootCacheServices', () => {
  afterEach(async () => {
    await new BootCacheStore().clear();
  });

  test('writes nothing before the services open', async ({ expect }) => {
    const services = new BootCacheServices(provider(new Promise(() => {})));
    await services.persist([space]);
    expect(await new BootCacheStore().read()).toBeUndefined();
  });

  test('a listed space that exports nothing keeps what it wrote', async ({ expect }) => {
    const services = new BootCacheServices(provider(Promise.resolve()));
    await services.open();
    await services.persist([space]);
    await services.persist([{ id: 'space', exportWorkingSet: () => [] }]);
    expect((await new BootCacheStore().read())?.spaces.get('space')).toHaveLength(1);
    await services.persist([]);
    expect((await new BootCacheStore().read())?.spaces.has('space')).toBe(false);
  });

  test('clear wins over a write queued before it, and later writes', async ({ expect }) => {
    const services = new BootCacheServices(provider(Promise.resolve()));
    await services.open();
    void services.persist([space]);
    await services.clear();
    await services.persist([space]);
    expect(await new BootCacheStore().read()).toBeUndefined();
  });
});
