//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { toSpaceStats } from './stats';

describe('toSpaceStats', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('counts objects, feeds and distinct types', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Feed.Feed, TestSchema.Expando] });
    db.add(Feed.make());
    db.add(Feed.make());
    db.add(Obj.make(TestSchema.Expando, { value: 1 }));
    await db.flush({ indexes: true });

    const objects = await db.query(Filter.everything()).run();
    const stats = toSpaceStats(objects, 7);
    expect(stats.feeds).toBe(2);
    expect(stats.objects).toBe(objects.length);
    expect(stats.plugins).toBe(7);
    expect(stats.types).toBeGreaterThanOrEqual(2);
  });
});
