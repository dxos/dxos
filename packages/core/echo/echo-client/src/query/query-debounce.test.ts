//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter, Obj } from '@dxos/echo';
import { type QueryAST } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing/index.ts';

/** Charged to every run of the slow query; with the default factor of 4 it debounces for 2 s. */
const SLOW_COST = 500;

/** Typenames as they appear in a query AST, which identify the two queries to the cost hook. */
const FAST_TYPENAME = 'com.example.type.person';
const SLOW_TYPENAME = 'com.example.type.organization';

describe('cost-proportional live query debounce', () => {
  test('a slow query coalesces invalidations while a fast one keeps re-running', async ({ expect }) => {
    // Runs counted on the host, since the client merges local writes into results before any re-run.
    const runs = { fast: 0, slow: 0 };
    const cost = (query: QueryAST.Query): number => {
      const json = JSON.stringify(query);
      if (json.includes(SLOW_TYPENAME)) {
        runs.slow++;
        return SLOW_COST;
      }
      if (json.includes(FAST_TYPENAME)) {
        runs.fast++;
      }
      // Measured time would make the fast query's debounce depend on the machine.
      return 0;
    };

    const builder = new EchoTestBuilder();
    await builder.open();
    try {
      const peer = await builder.createPeer({
        types: [TestSchema.Person, TestSchema.Organization],
        queryDebounce: { cost },
      });
      const db = await peer.createDatabase();
      const unsubscribeFast = db.query(Filter.type(TestSchema.Person)).subscribe();
      const unsubscribeSlow = db.query(Filter.type(TestSchema.Organization)).subscribe();
      try {
        // A first result is never debounced.
        await expect.poll(() => runs.fast > 0 && runs.slow > 0).toBe(true);

        // Each write invalidates both queries; wait for the fast one to re-run on the host before the next.
        const slowBefore = runs.slow;
        for (let index = 0; index < 5; index++) {
          const fastBefore = runs.fast;
          db.add(Obj.make(TestSchema.Person, { name: `person-${index}` }));
          db.add(Obj.make(TestSchema.Organization, { name: `org-${index}` }));
          await db.flush({ indexes: false });
          await expect.poll(() => runs.fast, { timeout: 1_500 }).toBeGreaterThan(fastBefore);
        }
        // At most one re-run inside a single debounce window: the one the first write may have caught.
        expect(runs.slow - slowBefore).toBeLessThanOrEqual(1);

        // The deferred invalidation is not lost: the slow query re-runs once its window closes.
        const slowAfterWrites = runs.slow;
        await expect.poll(() => runs.slow, { timeout: 5_000 }).toBeGreaterThan(slowAfterWrites);

        // Flushing indexes waits for query updates, so it runs a debounced query immediately.
        db.add(Obj.make(TestSchema.Organization, { name: 'flushed' }));
        const slowBeforeFlush = runs.slow;
        await db.flush({ indexes: true });
        expect(runs.slow).toBeGreaterThan(slowBeforeFlush);
      } finally {
        unsubscribeFast();
        unsubscribeSlow();
      }
    } finally {
      await builder.close();
    }
  });
});
