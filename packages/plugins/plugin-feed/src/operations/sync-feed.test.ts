//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, vi } from 'vitest';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';

import { FeedOperation, Subscription } from '../types';
import { FeedOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: FeedOperationHandlerSet,
  types: [Feed.Feed, Subscription.Subscription, Subscription.Post, Tag.Tag],
  disableLlmMemoization: true,
});

/**
 * Canned RSS XML returned by the stubbed global `fetch`. Two items with stable
 * guids — mirrors what an upstream RSS feed serves on repeated polls when no
 * new posts have been published.
 */
const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test feed</description>
    <item>
      <title>Post A</title>
      <link>https://example.com/a</link>
      <guid>post-a</guid>
      <description>A body</description>
      <pubDate>Wed, 01 Apr 2026 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Post B</title>
      <link>https://example.com/b</link>
      <guid>post-b</guid>
      <description>B body</description>
      <pubDate>Thu, 02 Apr 2026 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

/**
 * End-to-end tests for the {@link FeedOperation.SyncFeed} operation against
 * the full operation harness (Database + Feed services + handler registry).
 *
 * Stubs only the network boundary (`globalThis.fetch`) so the test exercises
 * the real RSS parser, real ECHO writes, and the real operation runtime.
 *
 * The original bug: each sync re-appended every previously-seen post because
 * the cursor filter `post.guid !== cursor` only excluded the single post whose
 * guid matched the cursor — every older post passed through and was appended
 * again. These tests pin the corrected, guid-deduped behavior.
 */
describe('SyncFeed', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(RSS_XML, { headers: { 'content-type': 'application/xml' } })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.scoped(
    're-syncing the same upstream response does not duplicate posts',
    Effect.fnUntraced(
      function* ({ expect }) {
        const subscriptionFeed = yield* Database.add(
          Subscription.makeSubscription({ name: 'feed', url: 'https://example.com/rss' }),
        );
        yield* Database.flush();
        const echoFeed = yield* Database.load(subscriptionFeed.feed);

        yield* Operation.invoke(FeedOperation.SyncFeed, { feed: Ref.make(subscriptionFeed) });
        yield* Operation.invoke(FeedOperation.SyncFeed, { feed: Ref.make(subscriptionFeed) });

        const items = yield* Feed.runQuery(echoFeed, Filter.type(Subscription.Post));
        expect(items).toHaveLength(2);
        const guids = items.map((post) => post.guid).sort();
        expect(guids).toEqual(['post-a', 'post-b']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
