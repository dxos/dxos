//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Blob, Feed, Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { EchoTestBuilder } from '../testing';

// Prices the read every mail sync pays before it fetches anything. `Cursor.layer` seeds its dedup set
// with two bounded tail queries over the mailbox feed, and — per `Cursor.ts`'s own note on
// `seedDedupSet` — a limited feed query still decodes the WHOLE feed to apply the limit. The filter is
// `Filter.everything()`, so inline blob items are decoded too: a mailbox that has accumulated inline
// attachments re-materialises all of them on every run, before a single message is fetched.
//
// Measured 2026-09-07, 0.5 MiB attachments, seed tail 5 (production default is 500):
//
//     items   inline held   seed heap peak   objects returned
//         4       2.0 MiB       11.1 MiB (5.5x)          8
//         8       4.0 MiB       23.2 MiB (5.8x)         10
//        12       6.0 MiB       39.4 MiB (6.6x)         10
//        16       8.0 MiB       48.7 MiB (6.1x)         10
//        20      10.0 MiB       60.8 MiB (6.1x)         10
//
// The returned object count is pinned at the limit while the peak grows linearly with the feed's total
// inline weight — ~6x it — which is the whole point: `limit` bounds the RESULT, not the DECODE. At 6x,
// a mailbox holding ~20 MiB of inline attachments exceeds a 128 MiB workerd isolate on this read alone,
// on every run, permanently: the failure ratchets rather than depending on the delta. `arrayBuffers`
// stays flat throughout, so the decoded payload is held as base64 STRINGS on the JS heap, never
// reaching `Uint8Array`.
//
// Routing attachment bytes to blob-service leaves a `ni:` URI in the block, so the same whole-feed
// decode reads a hundred bytes per item instead of a megabyte.
//
// Gated by `DX_MEM`; run with `--expose-gc`:
//
//   DX_MEM=1 NODE_OPTIONS=--expose-gc pnpm -C packages/core/echo/echo-client exec vitest run \
//     src/feed/feed-seed-cost.test.ts
//
// `evictFeedHandle` between stages models production: each sync runs in a fresh worker isolate with an
// empty working set, so the decode is paid again rather than served from the handle's resident cores.

const ATTACHMENT = Number.parseInt(process.env.DX_MEM_KB ?? '512', 10) * 1024;
const COUNT = Number.parseInt(process.env.DX_MEM_COUNT ?? '16', 10);
const SEED_TAIL = Number.parseInt(process.env.DX_MEM_TAIL ?? '5', 10);

const settle = () => {
  global.gc?.();
  global.gc?.();
};

const measure = async <T>(
  fn: () => Promise<T>,
): Promise<{ peak: number; peakBuffers: number; ms: number; value: T }> => {
  settle();
  const before = process.memoryUsage();
  const started = performance.now();
  let peak = before.heapUsed;
  let peakBuffers = before.arrayBuffers;
  const sampler = setInterval(() => {
    const usage = process.memoryUsage();
    peak = Math.max(peak, usage.heapUsed);
    peakBuffers = Math.max(peakBuffers, usage.arrayBuffers);
  }, 2);
  let value: T;
  try {
    value = await fn();
  } finally {
    clearInterval(sampler);
  }
  const ms = performance.now() - started;
  settle();
  return { peak: peak - before.heapUsed, peakBuffers: peakBuffers - before.arrayBuffers, ms, value };
};

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

describe.runIf(process.env.DX_MEM)('feed dedup-seed cost', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('the bounded tail read decodes the whole feed', { timeout: 600_000 }, async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob, Feed.Feed] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'mailbox' }));
    await db.flush();

    // The read `Cursor.layer` performs verbatim: newest-N and oldest-N, both `Filter.everything()`.
    const seedDedupSet = async () => {
      await db.evictFeedHandle(feed);
      const feedUri = Feed.getFeedUri(feed);
      invariant(feedUri, 'feed has no URI');
      const scope = Scope.feed(feedUri);
      const [newest, oldest] = await Promise.all([
        db.query(Query.select(Filter.everything()).from(scope).orderBy(Order.natural('desc')).limit(SEED_TAIL)).run(),
        db.query(Query.select(Filter.everything()).from(scope).orderBy(Order.natural('asc')).limit(SEED_TAIL)).run(),
      ]);
      return newest.length + oldest.length;
    };

    const rows: string[] = [];
    for (let appended = 0; appended < COUNT; appended += 4) {
      // Distinct content per item, so nothing dedups by digest.
      const batch = Array.from({ length: 4 }, (_unused, index) =>
        Obj.make(Blob.Blob, {
          type: 'application/octet-stream',
          size: ATTACHMENT,
          data: Blob.inlineData(new Uint8Array(ATTACHMENT).fill((appended + index) % 251)),
        }),
      );
      await db.appendToFeed(feed, batch);
      await db.flush();

      const held = (appended + 4) * ATTACHMENT;
      const { peak, peakBuffers, ms, value } = await measure(seedDedupSet);
      rows.push(
        `${String(appended + 4).padStart(3)} items  ${mb(held).padStart(9)} inline   seed heap ${mb(peak).padStart(10)} (${(peak / held).toFixed(1)}x held)   buffers ${mb(peakBuffers).padStart(9)}   ${ms.toFixed(0).padStart(6)} ms   read ${String(value).padStart(3)} objects`,
      );
    }

    // eslint-disable-next-line no-console
    console.log(['', `attachment: ${mb(ATTACHMENT)}   seed tail (limit): ${SEED_TAIL}`, ...rows, ''].join('\n'));

    expect(rows).toHaveLength(COUNT / 4);
  });
});
