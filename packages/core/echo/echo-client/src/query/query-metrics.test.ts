//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, test } from 'vitest';

import { Event, sleep } from '@dxos/async';
import { Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { type QueryContext, type SourceEntry } from './query-context.ts';
import { queryMetrics } from './query-metrics.ts';
import { QueryResultImpl } from './query-result.ts';

describe('queryMetrics', () => {
  beforeEach(() => {
    queryMetrics.reset();
  });

  test('groups queries by text and counts runs, subscriptions and active queries', async ({ expect }) => {
    const query = Query.select(Filter.type(TestSchema.Person));
    const entries: SourceEntry[] = ['Alice', 'Bob'].map((name) => {
      const person = Obj.make(TestSchema.Person, { name });
      return { id: person.id, result: person };
    });
    const first = new QueryResultImpl(makeQueryContext(entries), query);
    const second = new QueryResultImpl(makeQueryContext(entries), query);

    await first.run();
    const unsubscribe = second.subscribe();
    // The reactive execution is timed up to the first recompute that holds every source's answer.
    expect(second.results).toHaveLength(2);

    const metrics = queryMetrics.getMetrics().find((entry) => entry.query === Query.pretty(query));
    expect(metrics).toMatchObject({
      created: 2,
      runs: 1,
      subscriptions: 1,
      active: 1,
      executions: 2,
      lastCount: 2,
      maxCount: 2,
    });

    unsubscribe();
    expect(queryMetrics.getMetrics().find((entry) => entry.query === Query.pretty(query))?.active).toBe(0);
  });

  test('times evaluation only, not the wait for an answer', async ({ expect }) => {
    const WAIT_MS = 200;
    const HOST_TIME_MS = 5;
    const runQuery = Query.select(Filter.type(TestSchema.Person));
    await new QueryResultImpl(
      {
        ...makeQueryContext(),
        run: async (_ctx, _query, opts) => {
          await sleep(WAIT_MS);
          opts?.onExecutionTime?.(HOST_TIME_MS);
          return [];
        },
      },
      runQuery,
    ).run();

    let pending = true;
    const changed = new Event<void>();
    const reactiveQuery = Query.select(Filter.type(TestSchema.Organization));
    const unsubscribe = new QueryResultImpl(
      {
        ...makeQueryContext(),
        changed,
        hasPendingSources: () => pending,
        getRemoteExecutionTime: () => (pending ? undefined : HOST_TIME_MS),
      },
      reactiveQuery,
    ).subscribe();
    await sleep(WAIT_MS);
    pending = false;
    changed.emit();
    unsubscribe();

    for (const query of [runQuery, reactiveQuery]) {
      const metrics = queryMetrics.getMetrics().find((entry) => entry.query === Query.pretty(query));
      expect(metrics?.executions).toBe(1);
      expect(metrics?.maxTime).toBeGreaterThanOrEqual(HOST_TIME_MS);
      expect(metrics?.maxTime).toBeLessThan(WAIT_MS / 2);
    }
  });

  test('reset keeps the active count of running queries', ({ expect }) => {
    const query = Query.select(Filter.everything());
    const unsubscribe = new QueryResultImpl(makeQueryContext(), query).subscribe();
    queryMetrics.reset();

    expect(queryMetrics.getMetrics()).toEqual([
      expect.objectContaining({ query: Query.pretty(query), active: 1, runs: 0 }),
    ]);
    unsubscribe();
  });
});

const makeQueryContext = (results: SourceEntry[] = []): QueryContext => ({
  getResults: () => results,
  isSynchronous: () => true,
  hasPendingSources: () => false,
  getCompleteness: () => 'complete',
  getSourceStates: () => [],
  changed: new Event<void>(),
  run: async () => results,
  update: () => {},
  start: () => {},
  stop: () => {},
});
