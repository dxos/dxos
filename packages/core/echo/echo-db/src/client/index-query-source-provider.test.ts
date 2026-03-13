//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { type Hypergraph } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { SpaceId } from '@dxos/keys';
import { QueryReactivity, type QueryRequest, type QueryService } from '@dxos/protocols/proto/dxos/echo/query';

import { IndexQuerySource } from './index-query-source-provider';

// Mock graph - only used for queue items which are not tested here.
const mockGraph = {} as Hypergraph.Hypergraph;

const makeQuery = (): QueryAST.Query => ({
  type: 'from',
  query: {
    type: 'select',
    filter: {
      type: 'object',
      typename: 'dxn:type:org.dxos.type.person:0.1.0',
      props: {},
    },
  },
  from: {
    _tag: 'scope',
    scope: {
      spaceIds: [SpaceId.random()],
    },
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
        loadObject: async (_ctx) => undefined,
      },
      graph: mockGraph,
    });

    const query = makeQuery();

    // Update before open should not hit the remote service.
    source.update(Context.default(), query);
    expect(calls).toHaveLength(0);

    // Open alone should not start the query until the next update (GraphQueryContext calls update after open).
    source.open(Context.default());
    expect(calls).toHaveLength(0);

    source.update(Context.default(), query);
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
        loadObject: async (_ctx) => undefined,
      },
      graph: mockGraph,
    });

    // Avoid any side effects caused by `changed` listeners.
    const ctx = new Context();
    source.changed.on(ctx, () => {});

    const query = makeQuery();
    source.update(Context.default(), query);
    const results = await source.run(Context.default(), query);

    expect(results).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].reactivity).toBe(QueryReactivity.ONE_SHOT);
  });
});
