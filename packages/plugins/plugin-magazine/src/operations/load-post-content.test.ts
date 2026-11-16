//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, vi } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { MagazineOperationHandlerSet } from '#operations';
import { FeedOperation, Subscription } from '#types';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: MagazineOperationHandlerSet,
  types: [Feed.Feed, Subscription.Subscription, Subscription.Post, Subscription.PostContent, Tag.Tag],
  disableLlmMemoization: true,
});

const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Post A</title>
      <link>https://example.com/a</link>
      <guid>post-a</guid>
      <description>A body</description>
    </item>
  </channel>
</rss>`;

const ARTICLE_TEXT = 'The full article body, long enough to be taken as the article rather than as page chrome.';

const ARTICLE_HTML = `<!doctype html>
<html><head><title>Post A</title></head>
<body><article><h1>Post A</h1>${`<p>${ARTICLE_TEXT}</p>`.repeat(8)}</article></body></html>`;

describe('LoadPostContent', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        (input instanceof Request ? input.url : String(input)).includes('/rss')
          ? new Response(RSS_XML, { headers: { 'content-type': 'application/xml' } })
          : new Response(ARTICLE_HTML, { headers: { 'content-type': 'text/html' } }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // A caller across an invocation boundary (EDGE, an agent's tool call) passes the post as a bare reference: nothing
  // has resolved its target, and a post that was synced but never curated lives only in its subscription's feed.
  it.effect(
    'loads a post passed as an unresolved reference to a feed item',
    Effect.fnUntraced(
      function* ({ expect }) {
        const subscription = yield* Database.add(
          Subscription.makeSubscription({ name: 'feed', url: 'https://example.com/rss' }),
        );
        yield* Database.flush();
        yield* Operation.invoke(FeedOperation.SyncFeed, { feed: Ref.make(subscription) });
        const [post] = yield* Feed.query(yield* Database.load(subscription.feed), Filter.type(Subscription.Post)).run;

        // Bound to the space, as decoding a wire input binds it, but with no target resolved.
        const unresolved = yield* Database.makeRef<Subscription.Post>(Obj.getURI(post));
        yield* Operation.invoke(FeedOperation.LoadPostContent, { post: unresolved });

        const content = yield* Effect.promise(() => Subscription.findPostContent(subscription, post));
        expect(content).toBeDefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.withStubbedFetch,
      TestHelpers.provideTestContext,
    ),
  );
});
