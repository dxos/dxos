//
// Copyright 2026 DXOS.org
//

import { beforeEach, afterEach, describe, expect, test } from 'vitest';

import { Feed, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Text } from '@dxos/schema';
import { Magazine, Subscription } from '../types';
import { applyPerFeedKeep } from './curate-magazine';

describe('applyPerFeedKeep', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [
        Feed.Feed,
        Subscription.Subscription,
        Subscription.Post,
        Magazine.Magazine,
        Tag.Tag,
        Text.Text,
      ],
    });

    const feed = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com/rss' }));
    const { magazine } = Magazine.make({ feeds: [Ref.make(feed)] });
    db.add(magazine);
    await db.flush();
    return { db, feed, magazine };
  };

  const makePost = (published: string, feedRef?: Ref.Ref<Subscription.Subscription>): Subscription.Post =>
    Obj.make(Subscription.Post, {
      title: `Post ${published}`,
      description: 'body',
      published,
      source: feedRef,
    });

  test('respects per-feed keep bound', async () => {
    const { db, feed, magazine } = await setup();
    Obj.update(feed, (feed) => { feed.keep = 2; });

    const posts = ['2026-01-01', '2026-01-02', '2026-01-03'].map((d) =>
      db.add(makePost(`${d}T00:00:00Z`, Ref.make(feed))),
    );
    Obj.update(magazine, (magazine) => {
      magazine.posts = posts.map((p) => Ref.make(p));
    });

    await applyPerFeedKeep(magazine, undefined);

    // Only the 2 newest should survive.
    expect(magazine.posts.length).toBe(2);
    const kept = magazine.posts.map((r) => (r.target as Subscription.Post | undefined)?.published);
    expect(kept).toContain('2026-01-03T00:00:00Z');
    expect(kept).toContain('2026-01-02T00:00:00Z');
    expect(kept).not.toContain('2026-01-01T00:00:00Z');
  });

  test('no-ops when within keep bound', async () => {
    const { db, feed, magazine } = await setup();
    Obj.update(feed, (feed) => { feed.keep = 10; });

    const posts = ['2026-01-01', '2026-01-02'].map((d) =>
      db.add(makePost(`${d}T00:00:00Z`, Ref.make(feed))),
    );
    Obj.update(magazine, (magazine) => {
      magazine.posts = posts.map((p) => Ref.make(p));
    });

    await applyPerFeedKeep(magazine, undefined);

    expect(magazine.posts.length).toBe(2);
  });

  test('preserves unresolved refs', async () => {
    const { db, feed, magazine } = await setup();
    Obj.update(feed, (feed) => { feed.keep = 1; });

    // One resolved post, one dangling ref.
    const resolved = Obj.make(Subscription.Post, { title: 'R', description: 'd', published: '2026-01-01T00:00:00Z', source: Ref.make(feed) });
    const dangling = Ref.make(Obj.make(Subscription.Post, { title: 'D', description: 'd' }));
    Obj.update(magazine, (magazine) => {
      magazine.posts = [Ref.make(resolved), dangling];
    });

    await applyPerFeedKeep(magazine, undefined);

    // keep=1 prunes down to 1 resolved, but dangling refs are always kept.
    expect(magazine.posts.length).toBe(2);
  });
});
