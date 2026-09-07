//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Blob, Entity, Feed, Obj } from '@dxos/echo';
import { EchoFeedCodec } from '@dxos/echo-protocol';

import { EchoTestBuilder } from '../testing';

// Attributes the cost of appending an object carrying INLINE bytes to the stage that pays it, on the
// path a mail attachment actually takes: `Cursor.commit` -> `Feed.append` -> `FeedHandle.append`, whose
// blocks live in the SQLite-backed `FeedSpace` DO.
//
// Stages 3-6 replicate `FeedObjectCore`'s private `canonicalDigestOf` (`structuredClone` ->
// `canonicalStringify` -> `cyrb128`) so each step is priced separately; stage 7 is the wire encoding
// `FeedHandle.append` performs. Each walks the whole object, so each re-materialises the base64 in full.
//
// Measured 2026-09-07, 1 MiB payload:
//
//   allocate bytes             heap    0.0 MiB    buffers   0.0 MiB      0 ms
//   Obj.make (inline blob)     heap    0.0 MiB    buffers   0.0 MiB    303 ms
//   Entity.toJSON              heap    0.0 MiB    buffers   0.0 MiB      2 ms
//   stripQueuePosition (clone) heap    0.0 MiB    buffers   0.0 MiB      1 ms
//   canonicalStringify         heap    0.0 MiB    buffers   0.0 MiB      4 ms
//   cyrb128                    heap    0.0 MiB    buffers   0.0 MiB      6 ms
//   JSON.stringify (wire)      heap    0.0 MiB    buffers   0.0 MiB      4 ms
//   db.appendToFeed (cold)     heap    0.0 MiB    buffers   0.0 MiB    436 ms
//   db.flush                   heap   10.5 MiB    buffers   5.3 MiB     65 ms
//   append + flush (warm 1)    heap  138.0 MiB    buffers   7.7 MiB    777 ms
//   append + flush (warm 2)    heap  171.9 MiB    buffers   3.7 MiB    677 ms
//   append + flush (warm 3)    heap  172.4 MiB    buffers   3.7 MiB    684 ms
//
// Every encoding stage is ~1.3x the payload (the base64) and effectively free; none of them is the
// cost. The cost is append-then-flush as a pair — ~172x, steady across repeats, and on the JS HEAP
// rather than in `arrayBuffers`, so it is not the bytes themselves being copied. Note that
// `db.appendToFeed` and `db.flush` measured separately total ~10x for the same work while the pair
// costs ~172x once the feed holds prior items: the extra is proportional to what is already IN the
// feed, the same whole-feed decode `feed-seed-cost.test.ts` isolates. Which sub-step inside the flush
// triggers that re-read is NOT localized here.
//
// Gated by `DX_MEM`; run with `--expose-gc`:
//
//   DX_MEM=1 NODE_OPTIONS=--expose-gc pnpm -C packages/core/echo/echo-client exec vitest run \
//     src/feed/feed-append-cost.test.ts

const PAYLOAD = Number.parseInt(process.env.DX_MEM_KB ?? '1024', 10) * 1024;

/** `canonicalStringify` from `feed-object-core.ts`, duplicated because it is module-private there. */
const canonicalStringify = (value: unknown): string => {
  const sortKeys = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map(sortKeys);
    }
    if (input !== null && typeof input === 'object') {
      return Object.keys(input as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sortKeys((input as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return input;
  };
  return JSON.stringify(sortKeys(value));
};

/** `cyrb128` from `feed-object-core.ts`, likewise duplicated. Allocates nothing; costs a pass. */
const cyrb128 = (input: string): string => {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }
  return [h1, h2, h3, h4].map((lane) => (lane >>> 0).toString(16).padStart(8, '0')).join('');
};

const settle = () => {
  global.gc?.();
  global.gc?.();
};

/**
 * Peak heap and peak off-heap (`arrayBuffers` — where a `Uint8Array` payload actually lives, and
 * which `heapUsed` does not see) while `fn` runs, what survives a forced GC, and the elapsed time.
 */
const measure = async <T>(
  fn: () => Promise<T> | T,
): Promise<{ peak: number; peakBuffers: number; retained: number; ms: number; value: T }> => {
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
  const after = process.memoryUsage();
  return {
    peak: peak - before.heapUsed,
    peakBuffers: peakBuffers - before.arrayBuffers,
    retained: after.heapUsed - before.heapUsed,
    ms,
    value,
  };
};

const ratio = (bytes: number) => `${(bytes / PAYLOAD).toFixed(1)}x`;
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

describe.runIf(process.env.DX_MEM)('feed append cost by stage', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('which stage allocates', { timeout: 300_000 }, async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob, Feed.Feed] });
    const db = await peer.createDatabase();
    const feed = db.add(Feed.make({ name: 'attachments' }));
    await db.flush();

    const rows: string[] = [];
    const report = (
      label: string,
      { peak, peakBuffers, retained, ms }: { peak: number; peakBuffers: number; retained: number; ms: number },
    ) => {
      rows.push(
        `${label.padEnd(28)} heap ${mb(peak).padStart(10)} (${ratio(peak).padStart(7)})   buffers ${mb(peakBuffers).padStart(9)} (${ratio(peakBuffers).padStart(7)})   retained ${mb(retained).padStart(9)}   ${ms.toFixed(0).padStart(5)} ms`,
      );
    };

    // Baseline: holding the payload itself, so every later stage is priced against bytes that
    // already exist rather than against zero.
    const alloc = await measure(() => new Uint8Array(PAYLOAD).fill(0x41));
    report('allocate bytes', alloc);

    // An inline blob wrapped in a plain object is what `processAttachments` hands the feed.
    const built = await measure(() =>
      Obj.make(Blob.Blob, {
        type: 'application/octet-stream',
        size: PAYLOAD,
        data: Blob.inlineData(alloc.value),
      }),
    );
    report('Obj.make (inline blob)', built);

    const json = await measure(() => Entity.toJSON(built.value) as Record<string, unknown>);
    report('Entity.toJSON', json);

    const cloned = await measure(() => EchoFeedCodec.stripQueuePosition(json.value));
    report('stripQueuePosition (clone)', cloned);

    const canonical = await measure(() => canonicalStringify(cloned.value));
    report('canonicalStringify', canonical);

    const digest = await measure(() => cyrb128(canonical.value));
    report('cyrb128', digest);

    const wire = await measure(() => JSON.stringify(json.value));
    report('JSON.stringify (wire)', wire);

    // Baseline: one append that carries no payload, so the per-append overhead is separated from
    // anything proportional to the bytes.
    const empty = await measure(() =>
      db.appendToFeed(feed, [
        Obj.make(Blob.Blob, { type: 'text/plain', size: 1, data: Blob.inlineData(new Uint8Array([1])) }),
      ]),
    );
    report('append 1-byte blob', empty);

    // The same weight as a base64 STRING rather than a `Uint8Array`, to separate the cost of the
    // bytes from the cost of encoding them.
    const asString = await measure(() =>
      db.appendToFeed(feed, [
        Obj.make(
          Blob.Blob,
          { type: 'text/plain', size: PAYLOAD, data: Blob.inlineData(new Uint8Array(0)) },
          { meta: { keys: [{ source: 'test', id: wire.value.slice(0, PAYLOAD) }] } },
        ),
      ]),
    );
    report('append same-size string', asString);

    // End to end, through the real path: `FeedObjectCore`'s constructor digest, `captureForAppend`'s
    // second `toJSON` + digest, the wire encoding, and the RPC into the feed service.
    const bigBlob = Obj.make(Blob.Blob, {
      type: 'application/octet-stream',
      size: PAYLOAD,
      data: Blob.inlineData(new Uint8Array(PAYLOAD).fill(0x42)),
    });
    const appended = await measure(() => db.appendToFeed(feed, [bigBlob]));
    report('db.appendToFeed (cold)', appended);

    const flushed = await measure(() => db.flush());
    report('db.flush', flushed);

    // Repeat identically: whatever the first append paid for one-time feed-handle, query-engine and
    // storage setup does not recur, so the steady-state per-attachment cost is what these show.
    for (let round = 1; round <= 3; round++) {
      const warm = await measure(async () => {
        await db.appendToFeed(feed, [
          Obj.make(Blob.Blob, {
            type: 'application/octet-stream',
            size: PAYLOAD,
            data: Blob.inlineData(new Uint8Array(PAYLOAD).fill(0x50 + round)),
          }),
        ]);
        await db.flush();
      });
      report(`append + flush (warm ${round})`, warm);
    }

    // eslint-disable-next-line no-console
    console.log(
      [
        '',
        `payload: ${mb(PAYLOAD)}`,
        `base64 length: ${(wire.value.length / PAYLOAD).toFixed(2)}x payload`,
        ...rows,
        '',
      ].join('\n'),
    );

    expect(wire.value.length).toBeGreaterThan(PAYLOAD);
  });
});
