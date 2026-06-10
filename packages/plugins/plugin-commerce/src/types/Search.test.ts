//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Feed, Filter, Obj, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TagIndex } from '@dxos/schema';

import { Result } from './Result';
import * as Search from './Search';

describe('Search type', () => {
  test('make + instanceOf with defaults', ({ expect }) => {
    const search = Search.make({ name: 'Cars' });
    expect(Search.instanceOf(search)).toBe(true);
    expect(search.providers).toEqual([]);
    expect(search.params).toEqual({});
    // Results live in a backing feed (created by make), not an inline array.
    expect(search.feed).toBeDefined();
  });
});

describe('Search starred tags', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('starring a feed result via the Search tag index', async ({ expect }) => {
    const { db, queues } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Search.Search, Result, TagIndex.TagIndex],
    });
    const search = db.add(Search.make({ name: 'Cars' }));
    await db.flush();

    const feed = search.feed!.target!;
    const result = Obj.make(Result, { title: 'A', url: 'https://x/1', images: [], properties: {} });
    await queues.get(Feed.getQueueUri(feed)!).append([result]);

    expect(Search.isStarred(search, result.id, await Search.findStarredUri(db))).toBe(false);

    await Search.setStarred(search, result.id, db, true);
    const starredUri = await Search.findStarredUri(db);
    expect(starredUri).toBeDefined();
    expect(Search.isStarred(search, result.id, starredUri)).toBe(true);
    // A "Starred" Tag object was created.
    expect((await db.query(Filter.type(Tag.Tag)).run()).map((tag) => tag.label)).toContain('Starred');

    await Search.setStarred(search, result.id, db, false);
    expect(Search.isStarred(search, result.id, starredUri)).toBe(false);
  });
});
