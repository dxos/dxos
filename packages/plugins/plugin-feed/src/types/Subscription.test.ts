//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createFeedServiceLayer } from '@dxos/client/echo';
import { Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';
import { StateMap, TagIndex } from '@dxos/schema';

import { Magazine, Subscription } from './index';

describe('per-Post state keyed by entity id', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const loadQueuePost = async () => {
    const { db } = await builder.createDatabase({
      types: [Feed.Feed, Tag.Tag, Subscription.Subscription, Subscription.Post, StateMap.StateMap, TagIndex.TagIndex],
    });

    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com/rss' }));
    await db.flush();

    const postFeed = subscription.feed.target!;
    const post = Obj.make(Subscription.Post, {
      title: 'Article',
      link: 'https://example.com/a',
      source: Ref.make(subscription),
    });
    await EffectEx.runAndForwardErrors(
      Feed.append(postFeed, [post]).pipe(Effect.provide(createFeedServiceLayer(db))),
    );
    const [queuePost] = await EffectEx.runAndForwardErrors(
      Feed.runQuery(postFeed, Filter.type(Subscription.Post)).pipe(Effect.provide(createFeedServiceLayer(db))),
    );
    expect(queuePost).toBeDefined();
    return { db, subscription, queuePost: queuePost! };
  };

  test('setTag indexes queue posts by entity id, not echo uri', async () => {
    const { db, subscription, queuePost } = await loadQueuePost();

    await Subscription.setTag(subscription, queuePost.id, db, 'starred', true);
    await db.flush();

    const starredUri = await Subscription.findSystemTagUri(db, 'starred');
    expect(Subscription.hasTag(subscription, queuePost.id, starredUri)).toBe(true);
    expect(Subscription.hasTag(subscription, Obj.getURI(queuePost), starredUri)).toBe(false);
  });

  test('setReadAt indexes queue posts by entity id, not echo uri', async () => {
    const { subscription, queuePost } = await loadQueuePost();

    Subscription.setReadAt(subscription, queuePost.id, '2026-01-01T00:00:00Z');
    expect(Subscription.getReadAt(subscription, queuePost.id)).toBe('2026-01-01T00:00:00Z');
    expect(Subscription.getReadAt(subscription, Obj.getURI(queuePost))).toBeUndefined();
  });
});

describe('PostContent reverse-ref lookup', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('findPostContent resolves via post ref and reverse-ref index', async () => {
    const { db } = await builder.createDatabase({
      types: [
        Feed.Feed,
        Subscription.Subscription,
        Subscription.Post,
        Subscription.PostContent,
        Magazine.Magazine,
        StateMap.StateMap,
        TagIndex.TagIndex,
      ],
    });
    const space = { db };

    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com/rss' }));
    await db.flush();

    const postFeed = subscription.feed.target!;
    const post = Obj.make(Subscription.Post, {
      title: 'Article',
      link: 'https://example.com/a',
      source: Ref.make(subscription),
    });
    await EffectEx.runAndForwardErrors(
      Feed.append(postFeed, [post]).pipe(Effect.provide(createFeedServiceLayer(db))),
    );
    const [queuePost] = await EffectEx.runAndForwardErrors(
      Feed.runQuery(postFeed, Filter.type(Subscription.Post)).pipe(Effect.provide(createFeedServiceLayer(db))),
    );
    expect(queuePost).toBeDefined();

    await Subscription.appendPostContent(space, subscription, {
      post: queuePost!,
      text: '# Hello',
      snippet: 'Hello',
      fetchedAt: '2026-01-01T00:00:00Z',
    });
    await db.flush({ indexes: true });

    const found = await Subscription.findPostContent(subscription, queuePost!);
    expect(found?.text).toBe('# Hello');
    expect(EID.equals(EID.parse(found!.post.uri), EID.parse(Obj.getURI(queuePost!)))).toBe(true);
  });

  test('queryPostContentForPost returns newest entry after refresh append', async () => {
    const { db } = await builder.createDatabase({
      types: [
        Feed.Feed,
        Subscription.Subscription,
        Subscription.Post,
        Subscription.PostContent,
        StateMap.StateMap,
        TagIndex.TagIndex,
      ],
    });
    const space = { db };

    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com/rss' }));
    await db.flush();

    const postFeed = subscription.feed.target!;
    const post = Obj.make(Subscription.Post, {
      title: 'Article',
      link: 'https://example.com/a',
      source: Ref.make(subscription),
    });
    await EffectEx.runAndForwardErrors(
      Feed.append(postFeed, [post]).pipe(Effect.provide(createFeedServiceLayer(db))),
    );
    const [queuePost] = await EffectEx.runAndForwardErrors(
      Feed.runQuery(postFeed, Filter.type(Subscription.Post)).pipe(Effect.provide(createFeedServiceLayer(db))),
    );
    expect(queuePost).toBeDefined();

    await Subscription.appendPostContent(space, subscription, {
      post: queuePost!,
      text: 'v1',
      fetchedAt: '2026-01-01T00:00:00Z',
    });
    await Subscription.appendPostContent(space, subscription, {
      post: queuePost!,
      text: 'v2',
      fetchedAt: '2026-01-02T00:00:00Z',
    });
    await db.flush({ indexes: true });

    const query = Subscription.queryPostContentForPost(subscription, queuePost!);
    expect(query).toBeDefined();

    const entries = await db.query(query!).run();
    expect(entries.map((entry) => entry.text).sort()).toEqual(['v1', 'v2']);

    const latest = await Subscription.findPostContent(subscription, queuePost!);
    expect(latest?.text).toBe('v2');
  });
});
