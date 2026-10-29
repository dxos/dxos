//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';
import * as EffectEx from '@dxos/effect/EffectEx';
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

    await EffectEx.runPromise(impl['DataService.updateSubscription']({ subscriptionId, add: [{ id: documentId }] }));
    await reported.wait({ timeout: 1000 });

    // Without this the subscriber is told nothing at all and its handle waits for bytes no one is
    // fetching — the 15s space-open hang (DX-1297).
    expect(batches.at(-1)).toEqual({ updates: [{ documentId, unavailable: true }] });
  });

  test('a passive add with heads fetches nothing; one without, and the others, still load', async ({ expect }) => {
    const subscriptionId = 'test-subscription';
    const requested: string[][] = [];
    const impl = new DataServiceImpl({} as EdgeFunctionEnv.TraceContext, {
      ...emptyDataService(),
      getDocuments: async (_ctx, _spaceId, documentIds) => {
        requested.push(documentIds);
        return Object.assign([] as EdgeFunctionEnv.RawDocument[], { [Symbol.dispose]: () => {} });
      },
    });
    const registered = new Trigger();
    void EffectEx.runPromise(
      Stream.runForEach(impl['DataService.subscribe']({ subscriptionId, spaceId: SpaceId.random() }), () =>
        Effect.sync(() => registered.wake()),
      ),
    );
    await registered.wait({ timeout: 1000 });

    await EffectEx.runPromise(
      impl['DataService.updateSubscription']({
        subscriptionId,
        add: [{ id: 'held', heads: ['head-1'], passive: true }],
      }),
    );
    expect(requested).toEqual([]);

    await EffectEx.runPromise(
      impl['DataService.updateSubscription']({
        subscriptionId,
        add: [
          { id: 'held', heads: ['head-1'], passive: true },
          { id: 'written', heads: ['head-2'] },
          { id: 'directory', passive: true },
        ],
      }),
    );
    expect(requested).toEqual([['written', 'directory']]);
  });

  test('a document created from bytes is created empty, then takes the bytes as its first change', async ({
    expect,
  }) => {
    const spaceId = SpaceId.random();
    const initialDocument = new Uint8Array([1, 2, 3]);
    const calls: unknown[] = [];
    const impl = new DataServiceImpl({} as EdgeFunctionEnv.TraceContext, {
      ...emptyDataService(),
      createDocument: async (_ctx, _spaceId, initialValue) => {
        calls.push({ create: initialValue });
        return { documentId: 'created', [Symbol.dispose]: () => {} };
      },
      changeDocument: async (_ctx, _spaceId, documentId, changes) => {
        calls.push({ change: documentId, changes });
      },
    });

    const response = await EffectEx.runPromise(impl['DataService.createDocument']({ spaceId, initialDocument }));

    expect(response).toEqual({ documentId: 'created' });
    // EDGE's create takes only JSON, which cannot carry Automerge values.
    expect(calls).toEqual([{ create: undefined }, { change: 'created', changes: initialDocument }]);
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
