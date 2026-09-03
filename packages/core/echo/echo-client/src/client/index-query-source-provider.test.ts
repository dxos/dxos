//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as EffectScope from 'effect/Scope';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Entity, type Hypergraph, Scope } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId, type SpaceId, SpaceId as SpaceId$ } from '@dxos/keys';
import { makeInProcessClient } from '@dxos/protocols';
import {
  QueryReactivity,
  type QueryRequest,
  type QueryResponse,
  type QueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';
import { QueryService } from '@dxos/protocols/rpc';

import { type ObjectUpdate } from './index-query-source-provider.ts';
import { IndexQuerySource } from './index-query-source-provider.ts';

// Mock graph - only used for queue items which are not tested here.
const mockGraph = {} as Hypergraph.Hypergraph;

/** No-op update signal for tests that don't exercise re-hydration. */
const noopUpdateEvent = new Event<ObjectUpdate>();

const makeScopedQuery = (scopes: QueryAST.Scope[]): QueryAST.Query => ({
  type: 'from',
  query: {
    type: 'select',
    filter: {
      type: 'object',
      typename: DXN.make('org.dxos.type.person', '0.1.0'),
      props: {},
    },
  },
  from: {
    _tag: 'scope',
    scopes,
  },
});

const makeQuery = (spaceId: SpaceId = SpaceId$.random()): QueryAST.Query =>
  makeScopedQuery([Scope.space({ id: spaceId })]);

describe('IndexQuerySource', () => {
  test('does not start a REACTIVE remote query until open() is called', async () => {
    const calls: QueryRequest[] = [];

    const service = await makeQueryClient({
      'QueryService.setConfig': () => Effect.void,
      'QueryService.execQuery': (request) => {
        calls.push(request);
        return EffectEx.streamFromEmitter<QueryResponse>((emit) => {
          queueMicrotask(() => void emit.single({ queryId: request.queryId, results: [] }));
        });
      },
      'QueryService.reindex': () => Effect.void,
    });

    const source = new IndexQuerySource({
      service,
      runtime: EffectContext.empty(),
      objectLoader: {
        loadObject: async () => undefined,
        updateEvent: noopUpdateEvent,
      },
      graph: mockGraph,
    });

    const query = makeQuery();

    // Update before open should not hit the remote service.
    source.update(query);
    expect(calls).toHaveLength(0);

    // Open alone should not start the query until the next update (GraphQueryContext calls update after open).
    source.open();
    expect(calls).toHaveLength(0);

    // The reactive query is dispatched on the host stream fiber, so it lands after a turn.
    source.update(query);
    await expect.poll(() => calls).toHaveLength(1);
    expect(calls[0].reactivity).toBe(QueryReactivity.REACTIVE);
  });

  test('update() then run() issues only a ONE_SHOT remote query when not open', async () => {
    const calls: QueryRequest[] = [];

    const service = await makeQueryClient({
      'QueryService.setConfig': () => Effect.void,
      'QueryService.execQuery': (request) => {
        calls.push(request);
        return EffectEx.streamFromEmitter<QueryResponse>((emit) => {
          queueMicrotask(() => void emit.single({ queryId: request.queryId, results: [] }));
        });
      },
      'QueryService.reindex': () => Effect.void,
    });

    const source = new IndexQuerySource({
      service,
      runtime: EffectContext.empty(),
      objectLoader: {
        loadObject: async () => undefined,
        updateEvent: noopUpdateEvent,
      },
      graph: mockGraph,
    });

    // Avoid any side effects caused by `changed` listeners.
    const ctx = new Context();
    source.changed.on(ctx, () => {});

    const query = makeQuery();
    source.update(query);
    const results = await source.run(Context.default(), query);

    expect(results).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].reactivity).toBe(QueryReactivity.ONE_SHOT);
  });

  // Regression: a registry-only query forwarded to the remote QueryService fails the whole
  // query on edge — the query host rejects space-less queries ("Query must specify at least one
  // spaceId in options") and `GraphQueryContext.run`'s fail-fast merge discards the
  // `RegistryQuerySource`'s results. Surfaced by `projectCreate` over MCP (`SpaceOperation.
  // AddObject`'s type lookup is registry-scoped); dxos/edge mcp-operations project, DESIGN §6.
  test('registry-only queries never reach the remote service', async () => {
    const calls: QueryRequest[] = [];

    const service = await makeQueryClient({
      'QueryService.setConfig': () => Effect.void,
      'QueryService.execQuery': (request) => {
        calls.push(request);
        return EffectEx.streamFromEmitter<QueryResponse>((emit) => {
          queueMicrotask(() => void emit.single({ queryId: request.queryId, results: [] }));
        });
      },
      'QueryService.reindex': () => Effect.void,
    });

    const source = new IndexQuerySource({
      service,
      runtime: EffectContext.empty(),
      objectLoader: {
        loadObject: async () => undefined,
        updateEvent: noopUpdateEvent,
      },
      graph: mockGraph,
    });

    // `open()` subscribes to the shared `noopUpdateEvent` and `update()` opens a reactive
    // stream; close on teardown so neither outlives the test, including when an assertion throws.
    onTestFinished(() => source.close());

    const registryOnlyQuery = makeScopedQuery([Scope.registry()]);

    // One-shot: resolves empty locally without a remote round-trip.
    const results = await source.run(Context.default(), registryOnlyQuery);
    expect(results).toEqual([]);
    expect(calls).toHaveLength(0);

    // Reactive: no remote stream is opened either.
    source.open();
    source.update(registryOnlyQuery);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(calls).toHaveLength(0);

    // A mixed-scope query (space + registry) still queries the index for the space part.
    const mixedQuery = makeScopedQuery([Scope.space({ id: SpaceId$.random() }), Scope.registry()]);
    source.update(mixedQuery);
    await expect.poll(() => calls).toHaveLength(1);
    expect(calls[0].reactivity).toBe(QueryReactivity.REACTIVE);
  });

  test('re-hydrates reactive results when a previously-unavailable object loads', async () => {
    const spaceId = SpaceId$.random();
    const objectId = EntityId.random();

    // First host response references an object that isn't loadable yet (simulating a hydration
    // timeout / unavailable document); a later object update makes it loadable.
    // Fake entity at the loader boundary — only `id` is read by the source under test.
    let loaded: Entity.Unknown | undefined;

    let emit: ((results: QueryResult[]) => void) | undefined;
    const service = await makeQueryClient({
      'QueryService.setConfig': () => Effect.void,
      'QueryService.execQuery': (request) =>
        EffectEx.streamFromEmitter<QueryResponse>((streamEmit) => {
          emit = (results) => void streamEmit.single({ queryId: request.queryId, results });
        }),
      'QueryService.reindex': () => Effect.void,
    });

    const updateEvent = new Event<ObjectUpdate>();
    const source = new IndexQuerySource({
      service,
      runtime: EffectContext.empty(),
      objectLoader: {
        loadObject: async () => loaded,
        updateEvent,
      },
      graph: mockGraph,
    });

    const ctx = new Context();
    const nextChanged = () =>
      new Promise<void>((resolve) => {
        source.changed.once(() => resolve());
      });

    const query = makeQuery(spaceId);
    source.open();
    source.update(query);

    // `execQuery` runs on the host stream fiber, so the emitter is registered after a turn.
    await expect.poll(() => emit).toBeDefined();
    invariant(emit);

    // Host returns the index hit, but the object can't be hydrated yet → empty results.
    const settled = nextChanged();
    emit([{ id: objectId, spaceId, rank: 0 }]);
    await settled;
    expect(source.getResults()).toEqual([]);

    // The object's document loads locally; the update signal triggers re-hydration of the
    // remembered host records without a new host response.
    loaded = { id: objectId } as unknown as Entity.Unknown;
    const rehydrated = nextChanged();
    updateEvent.emit({ spaceId, objectIds: [objectId] });
    await rehydrated;
    expect(source.getResults().map((entry) => entry.id)).toEqual([objectId]);

    void ctx.dispose();
  });
});

/**
 * Bridges hand-written {@link QueryService.Handlers} to an in-process effect-rpc client (no wire hop),
 * matching the client shape `IndexQuerySource` consumes. The bridge scope is closed on test teardown.
 */
const makeQueryClient = async (handlers: QueryService.Handlers): Promise<QueryService.Client> => {
  const scope = Effect.runSync(EffectScope.make());
  onTestFinished(() => EffectEx.runPromise(EffectScope.close(scope, Exit.void)));
  return EffectEx.runPromise(
    makeInProcessClient(QueryService.Rpcs, handlers).pipe(Effect.provideService(EffectScope.Scope, scope)),
  );
};
