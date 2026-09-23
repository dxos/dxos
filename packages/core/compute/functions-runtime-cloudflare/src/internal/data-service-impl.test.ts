//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';
import { type EdgeFunctionEnv } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

import { DataServiceImpl } from './data-service-impl.ts';

describe('DataServiceImpl', () => {
  test('subscribe emits the ready beacon first', async ({ expect }) => {
    // The beacon path never touches the underlying binding, so an empty stub suffices.
    const impl = new DataServiceImpl({} as EdgeFunctionEnv.TraceContext, {} as EdgeFunctionEnv.DataService);

    const first = await EffectEx.runPromise(
      Stream.runHead(impl['DataService.subscribe']({ subscriptionId: 'test-subscription', spaceId: SpaceId.random() })),
    );

    // `RepoProxy` gates `updateSubscription` on this first batch; without it document loads hang.
    expect(first._tag).toBe('Some');
    expect(first._tag === 'Some' && first.value).toEqual({ updates: [] });
  });

  test('a document the host does not return is reported unavailable', async ({ expect }) => {
    const documentId = '3T3jLe47xeniLT8juutr68qyBzWu';
    const subscriptionId = 'test-subscription';
    const impl = new DataServiceImpl({} as EdgeFunctionEnv.TraceContext, emptyDataService());

    const batches: DataService.BatchedDocumentUpdates[] = [];
    const registered = new Trigger();
    const reported = new Trigger();
    void EffectEx.runPromise(
      Stream.runForEach(impl['DataService.subscribe']({ subscriptionId, spaceId: SpaceId.random() }), (batch) =>
        Effect.sync(() => {
          batches.push(batch);
          // The first batch is the ready beacon the host emits once the subscription exists; only
          // then does an `updateSubscription` for it resolve.
          (batch.updates?.length ? reported : registered).wake();
        }),
      ),
    );
    await registered.wait({ timeout: 1000 });

    await EffectEx.runPromise(impl['DataService.updateSubscription']({ subscriptionId, addIds: [documentId] }));
    await reported.wait({ timeout: 1000 });

    // Without this the subscriber is told nothing at all and its handle waits for bytes no one is
    // fetching — the 15s space-open hang (DX-1297).
    expect(batches.at(-1)).toEqual({ updates: [{ documentId, unavailable: true }] });
  });
});

/** A host that holds no documents, as the EDGE data plane does for a space that never replicated. */
const emptyDataService = (): EdgeFunctionEnv.DataService => ({
  getSpaceMeta: () => {
    throw new Error('not implemented');
  },
  getDocuments: async () => Object.assign([] as EdgeFunctionEnv.RawDocument[], { [Symbol.dispose]: () => {} }),
  execQuery: () => {
    throw new Error('not implemented');
  },
  createDocument: () => {
    throw new Error('not implemented');
  },
  changeDocument: () => {
    throw new Error('not implemented');
  },
});
