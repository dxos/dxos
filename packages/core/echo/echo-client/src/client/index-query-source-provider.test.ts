//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Entity, type Hypergraph, Scope } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { DXN, EntityId, type SpaceId, SpaceId as SpaceIdNs } from '@dxos/keys';
import { QueryReactivity, type QueryRequest, type QueryService } from '@dxos/protocols/proto/dxos/echo/query';

import { type ObjectUpdate } from './index-query-source-provider';
import { IndexQuerySource } from './index-query-source-provider';

// Mock graph - only used for queue items which are not tested here.
const mockGraph = {} as Hypergraph.Hypergraph;

/** No-op update signal for tests that don't exercise re-hydration. */
const noopUpdateEvent = new Event<ObjectUpdate>();

const makeQuery = (spaceId: SpaceId = SpaceIdNs.random()): QueryAST.Query => ({
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

    const service = {
      execQuery: (request: QueryRequest) => {
        calls.push(request);
        return {
          subscribe: (next: any) => {
            queueMicrotask(() => next({ queryId: request.queryId, results: [] }));
          },
          close: async () => {},
        } as any;
      },
    } as unknown as QueryService;

    const source = new IndexQuerySource({
      service,
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

    source.update(query);
    expect(calls).toHaveLength(1);
    expect(calls[0].reactivity).toBe(QueryReactivity.REACTIVE);
  });

  test('update() then run() issues only a ONE_SHOT remote query when not open', async () => {
    const calls: QueryRequest[] = [];

    const service = {
      execQuery: (request: QueryRequest) => {
        calls.push(request);
        return {
          subscribe: (next: any, _error?: any) => {
            queueMicrotask(() => next({ queryId: request.queryId, results: [] }));
          },
          close: async () => {},
        } as any;
      },
    } as unknown as QueryService;

    const source = new IndexQuerySource({
      service,
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
    const spaceId = SpaceIdNs.random();
    const objectId = EntityId.random();

    // First host response references an object that isn't loadable yet (simulating a hydration
    // timeout / unavailable document); a later object update makes it loadable.
    // Fake entity at the loader boundary — only `id` is read by the source under test.
    let loaded: Entity.Unknown | undefined;

    let emit!: (results: any[]) => void;
    const service = {
      execQuery: (request: QueryRequest) => ({
        subscribe: (next: any) => {
          emit = (results) => next({ queryId: request.queryId, results });
        },
        close: async () => {},
      }),
    } as unknown as QueryService;

    const updateEvent = new Event<ObjectUpdate>();
    const source = new IndexQuerySource({
      service,
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

    // Host returns the index hit, but the object can't be hydrated yet → empty results.
    const settled = nextChanged();
    emit([{ id: objectId, spaceId, rank: 0 } as any]);
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
