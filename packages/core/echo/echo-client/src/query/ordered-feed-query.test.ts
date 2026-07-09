//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Feed, Filter, Obj, Order, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing';

// A feed-scoped query with an `order` clause must honor the ordering (routing through the host
// indexer) rather than falling back to the client's newest-by-position tail window — feeds are not
// necessarily appended in sort order (e.g. a backward/backfill sync).
describe('ordered feed queries', () => {
  test('orderBy on a feed query sorts by the field, not by insertion position', async () => {
    const builder = await new EchoTestBuilder().open();
    const { db } = await builder.createDatabase({ types: [TestSchema.Task, Feed.Feed] });
    const feed = db.add(Feed.make({}));
    // Insertion order b, c, a — so position order differs from title order.
    await db.appendToFeed(feed, [
      Obj.make(TestSchema.Task, { title: 'b' }),
      Obj.make(TestSchema.Task, { title: 'c' }),
      Obj.make(TestSchema.Task, { title: 'a' }),
    ]);
    await db.flush({ indexes: true });

    const ordered = await db
      .query(
        Query.select(Filter.type(TestSchema.Task))
          .from(feed)
          .orderBy((_) => Order.asc(_.title))
          .limit(2),
      )
      .run();

    expect(ordered.map((task) => task.title)).toEqual(['a', 'b']);
    await builder.close();
  });
});
