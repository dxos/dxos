//
// Copyright 2026 DXOS.org
//

import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { Filter, Query } from '@dxos/echo';

import { type QueryContext } from './query-context';
import { QueryResultImpl } from './query-result';

describe('QueryResultImpl', () => {
  // Every result registers a diagnostic carrying a `StackTrace`, and an unformatted stack retains
  // the receiver of each frame it captured — the result under construction included. Holding those
  // diagnostics strongly therefore pinned the result, its query context, and the whole client graph
  // behind it, one graph per query, for the lifetime of the process. That OOMed long-lived hosts
  // (DX-1140). `QueryResultCache` is deliberately weak; this asserts the diagnostic doesn't defeat it.
  test('is collectable once dropped, despite the client-queries diagnostic', async ({ expect }) => {
    setFlagsFromString('--expose_gc');
    const gc: () => void = runInNewContext('gc');

    let live = 0;
    const registry = new FinalizationRegistry(() => {
      live--;
    });

    // Distinct queries so nothing dedupes, and no reference to any result survives the loop.
    for (let index = 0; index < 50; index++) {
      const query = Query.select(Filter.everything()).limit(index + 1);
      registry.register(new QueryResultImpl(makeQueryContext(), query), index);
      live++;
    }
    expect(live).toBe(50);

    await expect
      .poll(
        () => {
          gc();
          return live;
        },
        { timeout: 20_000 },
      )
      .toBe(0);
  });
});

const makeQueryContext = (): QueryContext => ({
  getResults: () => [],
  isSynchronous: () => true,
  changed: new Event<void>(),
  run: async () => [],
  update: () => {},
  start: () => {},
  stop: () => {},
});
