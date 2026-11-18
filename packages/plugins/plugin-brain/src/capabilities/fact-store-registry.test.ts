//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { afterEach, describe, test } from 'vitest';

import { MemoryService, RdfStore } from '@dxos/echo-memory';
import * as MemorySqlite from '@dxos/echo-memory-sqlite/MemorySqlite';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';

import { type SpaceMemoryAccess, makeFactStoreRegistry } from './fact-store-registry.ts';

type Runtime = ManagedRuntime.ManagedRuntime<MemoryService.MemoryService | RdfStore.RdfStore, never>;

/** One SQLite-backed memory per space, built up front, since the registry reads them synchronously. */
const makeAccess = async (spaceIds: readonly SpaceId[]) => {
  const runtimes: Runtime[] = [];
  const services = new Map<SpaceId, { memory: MemoryService.Service; rdf: RdfStore.Service }>();
  for (const spaceId of spaceIds) {
    const runtime: Runtime = ManagedRuntime.make(MemorySqlite.layerMemory);
    runtimes.push(runtime);
    services.set(
      spaceId,
      await runtime.runPromise(
        Effect.gen(function* () {
          return { memory: yield* MemoryService.MemoryService, rdf: yield* RdfStore.RdfStore };
        }),
      ),
    );
  }
  const resolve = (spaceId: SpaceId) => {
    const entry = services.get(spaceId);
    if (!entry) {
      throw new Error(`No memory for ${spaceId}`);
    }
    return entry;
  };
  const access: SpaceMemoryAccess = {
    memory: (spaceId) => resolve(spaceId).memory,
    rdf: (spaceId) => resolve(spaceId).rdf,
  };
  const dispose = () => Promise.all(runtimes.map((runtime) => runtime.dispose()));
  return { access, dispose };
};

describe('FactStoreRegistry', () => {
  let dispose: () => Promise<unknown> = async () => {};
  afterEach(() => dispose());

  const setup = async (...spaceIds: SpaceId[]) => {
    const memories = await makeAccess(spaceIds);
    dispose = memories.dispose;
    return makeFactStoreRegistry(memories.access);
  };

  test('notifies subscribers after a put and a clear, and stops after unsubscribe', async ({ expect }) => {
    const [first, second] = [SpaceId.random(), SpaceId.random()];
    const registry = await setup(first, second);
    const store = registry.forSpace(first);
    let notifications = 0;
    const unsubscribe = registry.subscribe(first, () => {
      notifications += 1;
    });
    let otherNotifications = 0;
    registry.subscribe(second, () => {
      otherNotifications += 1;
    });
    // The listener registers on the store asynchronously.
    await expect.poll(() => EffectEx.runPromise(store.query({}))).toEqual([]);

    await EffectEx.runPromise(store.importTrig(`<urn:a> <urn:b> <urn:c> .`));
    await expect.poll(() => notifications).toBe(1);
    await EffectEx.runPromise(store.clear());
    await expect.poll(() => notifications).toBeGreaterThan(1);
    expect(otherNotifications).toBe(0);

    unsubscribe();
    const seen = notifications;
    await EffectEx.runPromise(store.importTrig(`<urn:a> <urn:b> <urn:d> .`));
    expect(notifications).toBe(seen);
  });

  test('exports what it imports as TriG', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const registry = await setup(spaceId);
    const store = registry.forSpace(spaceId);
    const count = await EffectEx.runPromise(store.importTrig(`<urn:g> { <urn:a> <urn:b> "c" . }`));
    expect(count).toBe(1);
    const trig = await EffectEx.runPromise(store.exportTrig());
    expect(trig).toContain('<urn:a>');
  });

  test('logs each SPARQL query as it starts and ends, with its row count or error', async ({ expect }) => {
    const [first, second] = [SpaceId.random(), SpaceId.random()];
    const registry = await setup(first, second);
    await EffectEx.runPromise(registry.forSpace(first).importTrig(`<urn:g> { <urn:a> <urn:b> "c" . }`));
    const store = registry.logged(first);
    const seen: number[] = [];
    registry.subscribeQueries(first, () => seen.push(registry.queries(first).length));

    const sparql = 'SELECT ?p WHERE { GRAPH ?g { ?s ?p ?o } } LIMIT 1';
    await EffectEx.runPromise(store.rows(sparql));
    const [entry] = registry.queries(first);
    expect(entry.sparql).toBe(sparql);
    expect(entry.result && 'count' in entry.result ? entry.result.count : undefined).toBe(1);
    expect(entry.result && 'preview' in entry.result ? entry.result.preview : []).toHaveLength(1);

    await EffectEx.runPromise(store.rows('DELETE WHERE { ?s ?p ?o }').pipe(Effect.exit));
    const [, failed] = registry.queries(first);
    expect(failed.result && 'error' in failed.result).toBe(true);
    expect(seen).toEqual([1, 1, 2, 2]);
    expect(registry.queries(second)).toEqual([]);

    // A surface's own reads go through the unlogged store.
    await EffectEx.runPromise(registry.forSpace(first).rows(sparql));
    expect(registry.queries(first)).toHaveLength(2);
  });
});
