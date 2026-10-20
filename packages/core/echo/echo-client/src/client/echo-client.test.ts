//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { sleep } from '@dxos/async';
import { Feed, Filter, Obj, Order, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing/index.ts';

describe('EchoClient', () => {
  test('index catch-up restarts the one-shot index query budget', async () => {
    const builder = await new EchoTestBuilder().open();
    onTestFinished(async () => {
      await builder.close();
    });
    const { db, host } = await builder.createDatabase({ types: [TestSchema.Task, Feed.Feed], queryTimeout: 300 });
    const feed = db.add(Feed.make({}));
    await db.appendToFeed(feed, [Obj.make(TestSchema.Task, { title: 'a' })]);
    await db.flush({ indexes: true });

    // A catch-up longer than the budget that reports progress only as activity, never as a status change.
    const updateIndexes = host.updateIndexes.bind(host);
    vi.spyOn(host, 'updateIndexes').mockImplementation(async (request) => {
      for (let done = 1; done <= 6; done++) {
        await sleep(100);
        host.indexStatus.activityUpdated.emit({ catchUp: { done, total: 6 } });
      }
      return updateIndexes(request);
    });

    const tasks = await db
      .query(Query.select(Filter.type(TestSchema.Task)).from(feed).orderBy(Order.property('title', 'asc')))
      .run();
    expect(tasks.map((task) => task.title)).toEqual(['a']);
    expect(host.updateIndexes).toHaveBeenCalled();
  });
});
