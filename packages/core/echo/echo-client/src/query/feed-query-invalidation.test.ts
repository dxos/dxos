//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { QueryExecutor } from '@dxos/echo-host';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing/index.ts';

// A space-wide feed query (e.g. every trace message, ~10k rows) costs ~1s in SQLite; re-running it on
// every unrelated write is what made adding a task to a project take seconds.
describe('feed query invalidation', () => {
  test('a write to the space does not re-run a live feed query of another type', async () => {
    const builder = await new EchoTestBuilder().open();
    onTestFinished(() => builder.close());
    const { db, host } = await builder.createDatabase({ types: [TestSchema.Task, TestSchema.Person, Feed.Feed] });
    const feed = db.add(Feed.make({}));
    await db.appendToFeed(
      feed,
      Array.from({ length: 50 }, (_, index) => Obj.make(TestSchema.Person, { name: `person-${index}` })),
    );
    await db.flush({ indexes: true });

    const feedUri = Obj.getURI(feed);
    let feedQueryRuns = 0;
    const execQuery = QueryExecutor.prototype.execQuery;
    const spy = vi.spyOn(QueryExecutor.prototype, 'execQuery').mockImplementation(function (this: QueryExecutor) {
      if (JSON.stringify(this.query).includes(feedUri)) {
        feedQueryRuns++;
      }
      return execQuery.call(this);
    });
    onTestFinished(() => spy.mockRestore());

    const result = db.query(Query.select(Filter.type(TestSchema.Person)).from(feed));
    onTestFinished(result.subscribe(() => {}));
    await vi.waitFor(() => expect(result.results).toHaveLength(50));
    expect(feedQueryRuns).toBe(1);

    db.add(Obj.make(TestSchema.Task, { title: 'new task' }));
    await db.flush({ indexes: true });
    await host.queryService.awaitQueryUpdates();
    expect(feedQueryRuns).toBe(1);

    // Control: a write the query can see still re-runs it.
    await db.appendToFeed(feed, [Obj.make(TestSchema.Person, { name: 'person-50' })]);
    await vi.waitFor(() => expect(result.results).toHaveLength(51));
    expect(feedQueryRuns).toBe(2);
  });
});
