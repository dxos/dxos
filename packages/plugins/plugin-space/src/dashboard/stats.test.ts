//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { SPACE_STATS_QUERY, toSpaceStats } from './stats.ts';

describe('toSpaceStats', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('counts objects, feeds and distinct types from the per-type counts', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Feed.Feed, TestSchema.Expando] });
    db.add(Feed.make());
    db.add(Feed.make());
    db.add(Obj.make(TestSchema.Expando, { value: 1 }));
    await db.flush({ indexes: true });

    const rows = await db.query(SPACE_STATS_QUERY).run();
    expect(toSpaceStats(rows, 7)).toEqual({ objects: 3, feeds: 2, types: 2, plugins: 7 });
  });
});
