//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createFeedServiceLayer, type Space } from '@dxos/client/echo';
import { EID } from '@dxos/keys';
import { Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';

import { Magazine, Subscription } from '../types';
import { appendPostContent, findPostContent, queryPostContentForPost } from './post-content';

describe('PostContent reverse-ref lookup', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('findPostContent resolves via post ref and reverse-ref index', async () => {
    const { db, queues } = await builder.createDatabase({
      types: [
        Feed.Feed,
        Subscription.Subscription,
        Subscription.Post,
        Subscription.PostContent,
        Magazine.Magazine,
      ],
    });
    const space = { queues } as Space;

    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com/rss' }));
    await db.flush();

    const postFeed = subscription.feed.target!;
    const post = Obj.make(Subscription.Post, {
      title: 'Article',
      link: 'https://example.com/a',
      source: Ref.make(subscription),
    });
    await runAndForwardErrors(
      Feed.append(postFeed, [post]).pipe(Effect.provide(createFeedServiceLayer(queues))),
    );
    const [queuePost] = await runAndForwardErrors(
      Feed.runQuery(postFeed, Filter.type(Subscription.Post)).pipe(
        Effect.provide(createFeedServiceLayer(queues)),
      ),
    );
    expect(queuePost).toBeDefined();

    await appendPostContent(space, subscription, {
      post: queuePost!,
      text: '# Hello',
      snippet: 'Hello',
      fetchedAt: '2026-01-01T00:00:00Z',
    });
    await db.flush({ indexes: true });

    const found = await findPostContent(subscription, queuePost!);
    expect(found?.text).toBe('# Hello');
    expect(EID.equals(EID.parse(found!.post.uri), EID.parse(Obj.getURI(queuePost!)))).toBe(true);
  });

  test('queryPostContentForPost returns newest entry after refresh append', async () => {
    const { db, queues } = await builder.createDatabase({
      types: [Feed.Feed, Subscription.Subscription, Subscription.Post, Subscription.PostContent],
    });
    const space = { queues } as Space;

    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com/rss' }));
    await db.flush();

    const postFeed = subscription.feed.target!;
    const post = Obj.make(Subscription.Post, {
      title: 'Article',
      link: 'https://example.com/a',
      source: Ref.make(subscription),
    });
    await runAndForwardErrors(
      Feed.append(postFeed, [post]).pipe(Effect.provide(createFeedServiceLayer(queues))),
    );
    const [queuePost] = await runAndForwardErrors(
      Feed.runQuery(postFeed, Filter.type(Subscription.Post)).pipe(
        Effect.provide(createFeedServiceLayer(queues)),
      ),
    );
    expect(queuePost).toBeDefined();

    await appendPostContent(space, subscription, {
      post: queuePost!,
      text: 'v1',
      fetchedAt: '2026-01-01T00:00:00Z',
    });
    await appendPostContent(space, subscription, {
      post: queuePost!,
      text: 'v2',
      fetchedAt: '2026-01-02T00:00:00Z',
    });
    await db.flush({ indexes: true });

    const query = queryPostContentForPost(subscription, queuePost!);
    expect(query).toBeDefined();

    const entries = await db.query(query!).run();
    expect(entries.map((entry) => entry.text).sort()).toEqual(['v1', 'v2']);

    const latest = await findPostContent(subscription, queuePost!);
    expect(latest?.text).toBe('v2');
  });
});
