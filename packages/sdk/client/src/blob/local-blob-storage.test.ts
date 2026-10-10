//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, onTestFinished, test } from 'vitest';

import { Blob } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { Client } from '../client/index.ts';
import { TestBuilder } from '../testing/index.ts';

describe('local blob storage', () => {
  test('without an EDGE endpoint, blobs are stored in the host database rather than inline', async ({ expect }) => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    await space.waitUntilReady();

    const bytes = new TextEncoder().encode('local-first');
    const blob = await space.db.createBlob(bytes, { type: 'text/plain' });

    expect(client.graph.defaultBlobStorage).toBe(Blob.Storage.edge);
    expect(blob.data._tag).not.toBe('inline');
    expect(await space.db.readBlob(blob)).toEqual(bytes);
    expect(await space.db.blobExists(blob)).toBe(true);

    // Pending: there is no EDGE to upload to, and the ledger keeps it for a session that has one.
    const { keys } = await EffectEx.runPromise(
      client.services.rpc['BlobStoreService.listPending']({ limit: 10 }).pipe(Effect.orDie),
    );
    expect(keys).toHaveLength(1);
  });
});
