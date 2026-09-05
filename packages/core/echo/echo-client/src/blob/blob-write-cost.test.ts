//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Blob, Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import { EchoTestBuilder } from '../testing';

// Attributes the cost of writing an INLINE blob to the stage that pays it. `operation-service` stores
// every synced mail attachment inline and dies on `exceededMemory`; the sync-level measurement puts
// the cost near 105x the payload at 1 MiB, but not WHERE. `BlobManager.#put` for inline storage is
// just `{ _tag: 'inline', bytes }` — no copy, no digest — so everything below `fromBytes` is the
// candidate. Gated by `DX_MEM`; run with `--expose-gc` so the retained figure is meaningful:
//
//   DX_MEM=1 NODE_OPTIONS=--expose-gc pnpm -C packages/core/echo/echo-client exec vitest run \
//     src/blob/blob-write-cost.test.ts
//
// Measured 2026-09-05, 1 MiB payload:
//
//   allocate bytes           peak    0.0 MiB    retained 0.0 MiB   rss  -20.7 MiB
//   Blob.fromBytes           peak    0.0 MiB    retained 0.1 MiB   rss   41.5 MiB
//   Database.add             peak    0.0 MiB    retained 0.2 MiB   rss    8.8 MiB
//   db.flush (1 MiB blob)    peak  183.4 MiB    retained 0.6 MiB   rss  214.3 MiB
//   db.flush (1 byte blob)   peak    5.9 MiB    retained 0.4 MiB   rss    1.6 MiB
//
// The whole cost is the flush, it is TRANSIENT (0.6 MiB survives a forced GC), and it is
// proportional to the change being persisted rather than to the document holding it — the trailing
// 1-byte flush against a document that already carries the 1 MiB blob costs 5.9 MiB, so an
// accumulating mailbox does not re-pay for its history on every later sync. RSS exceeds the heap
// peak because Automerge 3 is wasm-backed and the document's own bytes live in linear memory, which
// `heapUsed` cannot see and a workerd isolate's limit can: ~214 MiB of an isolate's 128 MiB budget
// goes on persisting ONE 1 MiB attachment.

const PAYLOAD = Number.parseInt(process.env.DX_MEM_KB ?? '1024', 10) * 1024;

const settle = () => {
  global.gc?.();
  global.gc?.();
};

/**
 * Peak heap while `fn` runs, what survives a forced GC, and the RSS delta. RSS matters because
 * Automerge 3 is wasm-backed: the document's own bytes live in linear memory, which `heapUsed` does
 * not see but a workerd isolate's limit does.
 */
const measure = async <T>(fn: () => Promise<T>): Promise<{ peak: number; retained: number; rss: number; value: T }> => {
  settle();
  const before = process.memoryUsage();
  let peak = before.heapUsed;
  const sampler = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().heapUsed);
  }, 2);
  let value: T;
  try {
    value = await fn();
  } finally {
    clearInterval(sampler);
  }
  settle();
  const after = process.memoryUsage();
  return {
    peak: peak - before.heapUsed,
    retained: after.heapUsed - before.heapUsed,
    rss: after.rss - before.rss,
    value,
  };
};

const ratio = (bytes: number) => `${(bytes / PAYLOAD).toFixed(1)}x`;
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

describe.runIf(process.env.DX_MEM)('inline blob write cost by stage', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('which stage allocates', { timeout: 300_000 }, async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();
    const layer = Database.layer(db);
    const rows: string[] = [];

    const report = (label: string, { peak, retained, rss }: { peak: number; retained: number; rss: number }) => {
      rows.push(
        `${label.padEnd(24)} peak ${mb(peak).padStart(10)} (${ratio(peak).padStart(7)})   retained ${mb(retained).padStart(9)}   rss ${mb(rss).padStart(9)}`,
      );
    };

    // Baseline: holding the payload itself, so every later stage is measured against the bytes
    // already existing rather than against zero.
    const alloc = await measure(async () => new Uint8Array(PAYLOAD).fill(0x41));
    report('allocate bytes', alloc);

    const created = await measure(() =>
      Effect.gen(function* () {
        return yield* Blob.fromBytes(alloc.value, { type: 'application/octet-stream' });
      }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors),
    );
    report('Blob.fromBytes', created);

    const added = await measure(() =>
      Effect.gen(function* () {
        yield* Database.add(created.value);
      }).pipe(Effect.provide(layer), EffectEx.runAndForwardErrors),
    );
    report('Database.add', added);

    const flushed = await measure(() => db.flush());
    report('db.flush (1 MiB blob)', flushed);

    const second = await measure(() =>
      Effect.gen(function* () {
        yield* Database.add(Blob.make({ type: 'text/plain', size: 1, data: Blob.inlineData(new Uint8Array([1])) }));
      })
        .pipe(Effect.provide(layer), EffectEx.runAndForwardErrors)
        .then(() => db.flush()),
    );
    report('db.flush (1 byte blob)', second);

    // eslint-disable-next-line no-console
    console.log(['', `payload: ${mb(PAYLOAD)}`, ...rows, ''].join('\n'));

    expect(created.value.data._tag).toBe('inline');
  });
});
