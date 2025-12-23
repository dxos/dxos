//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Context } from '@dxos/context';
import { type QueryAST } from '@dxos/echo-protocol';
import { SpaceId } from '@dxos/keys';
import { QueryReactivity, type QueryRequest, type QueryService } from '@dxos/protocols/proto/dxos/echo/query';

import { IndexQuerySource } from './index-query-source-provider';

const makeQuery = (): QueryAST.Query => ({
  type: 'options',
  query: {
    type: 'select',
    filter: {
      type: 'object',
      typename: 'dxn:type:dxos.org/type/Person:0.1.0',
      props: {},
    },
  },
  options: {
    spaceIds: [SpaceId.random()],
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
      },
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
      },
    });

    // Avoid any side effects caused by `changed` listeners.
    const ctx = new Context();
    source.changed.on(ctx, () => {});

    const query = makeQuery();
    source.update(query);
    const results = await source.run(query);

    expect(results).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0].reactivity).toBe(QueryReactivity.ONE_SHOT);
  });
});
