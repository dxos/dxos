//
// Copyright 2026 DXOS.org
//

import { beforeEach, afterEach, describe, expect, test } from 'vitest';

import { Feed, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Text } from '@dxos/schema';
import { Magazine, Subscription } from '../types';
import { applyPerFeedKeep, dedupeMagazinePosts } from './curate-magazine';

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

describe('dedupeMagazinePosts', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Subscription.Subscription, Subscription.Post, Magazine.Magazine, Tag.Tag, Text.Text],
    });

    const feedA = db.add(Subscription.makeSubscription({ name: 'A', url: 'https://a.example/rss' }));
    const feedB = db.add(Subscription.makeSubscription({ name: 'B', url: 'https://b.example/rss' }));
    const { magazine } = Magazine.make({ feeds: [Ref.make(feedA), Ref.make(feedB)] });
    db.add(magazine);
    await db.flush();
    return { db, feedA, feedB, magazine };
  };

  test('drops duplicate link across feeds, keeps first in insertion order', async () => {
    const { db, feedA, feedB, magazine } = await setup();
    const sharedLink = 'https://example.com/article';
    const first = db.add(
      Obj.make(Subscription.Post, {
        title: 'First',
        description: 'body',
        link: sharedLink,
        guid: 'guid-a',
        source: Ref.make(feedA),
      }),
    );
    const second = db.add(
      Obj.make(Subscription.Post, {
        title: 'Second',
        description: 'body',
        link: sharedLink,
        guid: 'guid-b',
        source: Ref.make(feedB),
      }),
    );
    Obj.update(magazine, (magazine) => {
      magazine.posts = [Ref.make(first), Ref.make(second)];
    });

    dedupeMagazinePosts(magazine);

    expect(magazine.posts.length).toBe(1);
    expect(magazine.posts[0]?.target?.title).toBe('First');
  });

  test('drops duplicate guid with distinct links', async () => {
    const { db, feedA, magazine } = await setup();
    const sharedGuid = 'same-guid';
    const first = db.add(
      Obj.make(Subscription.Post, {
        title: 'First',
        description: 'body',
        link: 'https://example.com/one',
        guid: sharedGuid,
        source: Ref.make(feedA),
      }),
    );
    const second = db.add(
      Obj.make(Subscription.Post, {
        title: 'Second',
        description: 'body',
        link: 'https://example.com/two',
        guid: sharedGuid,
        source: Ref.make(feedA),
      }),
    );
    Obj.update(magazine, (magazine) => {
      magazine.posts = [Ref.make(first), Ref.make(second)];
    });

    dedupeMagazinePosts(magazine);

    expect(magazine.posts.length).toBe(1);
    expect(magazine.posts[0]?.target?.title).toBe('First');
  });

  test('no-ops when posts are unique', async () => {
    const { db, feedA, magazine } = await setup();
    const posts = [
      db.add(
        Obj.make(Subscription.Post, {
          title: 'A',
          description: 'body',
          link: 'https://example.com/a',
          source: Ref.make(feedA),
        }),
      ),
      db.add(
        Obj.make(Subscription.Post, {
          title: 'B',
          description: 'body',
          link: 'https://example.com/b',
          source: Ref.make(feedA),
        }),
      ),
    ];
    Obj.update(magazine, (magazine) => {
      magazine.posts = posts.map((post) => Ref.make(post));
    });

    dedupeMagazinePosts(magazine);

    expect(magazine.posts.length).toBe(2);
  });
});
