//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Runtime from 'effect/Runtime';
import * as EffectScope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Entity, type Hypergraph, Scope } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
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

import { type ObjectUpdate } from './index-query-source-provider';
import { IndexQuerySource } from './index-query-source-provider';

// Mock graph - only used for queue items which are not tested here.
const mockGraph = {} as Hypergraph.Hypergraph;

/** No-op update signal for tests that don't exercise re-hydration. */
const noopUpdateEvent = new Event<ObjectUpdate>();

const makeQuery = (spaceId: SpaceId = SpaceId$.random()): QueryAST.Query => ({
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
    scopes: [Scope.space({ id: spaceId })],
  },
});

describe('IndexQuerySource', () => {
  test('does not start a REACTIVE remote query until open() is called', async () => {
    const calls: QueryRequest[] = [];

    const service = await makeQueryClient({
      'QueryService.setConfig': () => Effect.void,
      'QueryService.execQuery': (request) => {
        calls.push(request);
        return Stream.async<QueryResponse>((emit) => {
          queueMicrotask(() => void emit.single({ queryId: request.queryId, results: [] }));
        });
      },
      'QueryService.reindex': () => Effect.void,
    });

    const source = new IndexQuerySource({
      service,
      runtime: Runtime.defaultRuntime,
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
        return Stream.async<QueryResponse>((emit) => {
          queueMicrotask(() => void emit.single({ queryId: request.queryId, results: [] }));
        });
      },
      'QueryService.reindex': () => Effect.void,
    });

    const source = new IndexQuerySource({
      service,
      runtime: Runtime.defaultRuntime,
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
        Stream.async<QueryResponse>((streamEmit) => {
          emit = (results) => void streamEmit.single({ queryId: request.queryId, results });
        }),
      'QueryService.reindex': () => Effect.void,
    });

    const updateEvent = new Event<ObjectUpdate>();
    const source = new IndexQuerySource({
      service,
      runtime: Runtime.defaultRuntime,
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
  onTestFinished(() => Effect.runPromise(EffectScope.close(scope, Exit.void)));
  return Effect.runPromise(
    makeInProcessClient(QueryService.Rpcs, handlers).pipe(Effect.provideService(EffectScope.Scope, scope)),
  );
};
