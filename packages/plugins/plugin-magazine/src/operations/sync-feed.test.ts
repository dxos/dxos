//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, vi } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Progress from '@dxos/app-toolkit/Progress';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { MagazineOperationHandlerSet } from '#operations';
import { FeedOperation, Subscription } from '#types';

import syncFeed from './sync-feed.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: MagazineOperationHandlerSet,
  types: [Feed.Feed, Subscription.Subscription, Subscription.Post, Tag.Tag],
  disableLlmMemoization: true,
});

/**
 * Canned RSS XML returned by the stubbed global `fetch`. Two items with stable
 * guids - mirrors what an upstream RSS feed serves on repeated polls when no
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
 * guid matched the cursor - every older post passed through and was appended
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

  it.effect(
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

        const items = yield* Feed.query(echoFeed, Filter.type(Subscription.Post)).run;
        expect(items).toHaveLength(2);
        const guids = items.map((post) => post.guid).sort();
        expect(guids).toEqual(['post-a', 'post-b']);
      },
      Effect.provide(TestLayer),
      TestHelpers.withStubbedFetch,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'within-batch and link-fallback dedup: same link served twice in one response is appended once',
    Effect.fnUntraced(
      function* ({ expect }) {
        // RSS items with NO `<guid>` element - the dedup key falls back to
        // `link`. Two items share the same link, simulating a misbehaving
        // upstream that serves the same post twice in one response.
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Duplicate Feed</title>
    <item>
      <title>First copy</title>
      <link>https://example.com/shared</link>
      <description>body</description>
    </item>
    <item>
      <title>Second copy</title>
      <link>https://example.com/shared</link>
      <description>body</description>
    </item>
  </channel>
</rss>`;
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => new Response(xml, { headers: { 'content-type': 'application/xml' } })),
        );

        const subscriptionFeed = yield* Database.add(
          Subscription.makeSubscription({ name: 'feed', url: 'https://example.com/rss' }),
        );
        yield* Database.flush();
        const echoFeed = yield* Database.load(subscriptionFeed.feed);

        yield* Operation.invoke(FeedOperation.SyncFeed, { feed: Ref.make(subscriptionFeed) });
        // Second sync also exercises the persisted-post dedup path for link-keyed items.
        yield* Operation.invoke(FeedOperation.SyncFeed, { feed: Ref.make(subscriptionFeed) });

        const items = yield* Feed.query(echoFeed, Filter.type(Subscription.Post)).run;
        expect(items).toHaveLength(1);
        expect(items[0].link).toBe('https://example.com/shared');
      },
      Effect.provide(TestLayer),
      TestHelpers.withStubbedFetch,
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'progress totals only the posts a sync adds and completes at that count',
    Effect.fnUntraced(
      function* ({ expect }) {
        const subscriptionFeed = yield* Database.add(
          Subscription.makeSubscription({ name: 'feed', url: 'https://example.com/rss' }),
        );
        yield* Database.flush();
        yield* Operation.invoke(FeedOperation.SyncFeed, { feed: Ref.make(subscriptionFeed) });

        // Upstream publishes one more post; the two already synced must not count toward the total.
        const xmlWithNewPost = RSS_XML.replace(
          '<item>',
          `<item>
      <title>Post C</title>
      <link>https://example.com/c</link>
      <guid>post-c</guid>
      <description>C body</description>
      <pubDate>Fri, 03 Apr 2026 00:00:00 GMT</pubDate>
    </item>
    <item>`,
        );
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => new Response(xmlWithNewPost, { headers: { 'content-type': 'application/xml' } })),
        );

        const statusUpdates: Trace.PayloadType<typeof Trace.StatusUpdate>[] = [];
        const traceLayer = Trace.testTraceService().pipe(
          Layer.provide(
            Layer.succeed(Trace.TraceSink, {
              write: (message) => {
                for (const event of Trace.flatten(message)) {
                  if (Trace.isOfType(Trace.StatusUpdate, event)) {
                    statusUpdates.push(event.data);
                  }
                }
              },
            }),
          ),
        );
        // The operation runtime traces to the test layer's own sink, so call the handler directly to capture.
        yield* syncFeed.handler({ feed: Ref.make(subscriptionFeed) }).pipe(Effect.provide(traceLayer));

        const progressKey = FeedOperation.createSyncProgressKey(subscriptionFeed);
        expect(statusUpdates.every((update) => update.progress?.key === progressKey)).toBe(true);
        const totals = statusUpdates
          .map((update) => update.progress?.total)
          .filter((total): total is number => total !== undefined);
        expect(totals).toEqual([1, 1]);
        const counts = statusUpdates
          .map((update) => update.progress?.current)
          .filter((current): current is number => current !== undefined);
        expect(counts.at(-1)).toBe(1);
        expect(statusUpdates.at(-1)?.message).toBe(Progress.STATUS_COMPLETE);
      },
      Effect.provide(TestLayer),
      TestHelpers.withStubbedFetch,
      TestHelpers.provideTestContext,
    ),
  );
});
