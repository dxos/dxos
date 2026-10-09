//
// Copyright 2026 DXOS.org
//

import { subDays } from 'date-fns';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { afterAll, beforeAll, describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';
import { Feed, Filter, Obj, Order, Query, Ref, Scope } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { ambientSyncServices, seedMailboxBinding } from '@dxos/plugin-inbox/testing/sync';

import { type GoogleMail } from '#apis';
import { type GmailDataset, GoogleMailApi } from '#services';

import { GMAIL_CONNECTOR_ID, GMAIL_SOURCE } from '../../../constants.ts';
import { generateGmailDataset } from '../../../testing/gmail-fixtures.ts';
import { runGoogleSync } from '../../../testing/sync-fixture.ts';

// Memory profile of a capped Gmail backfill, from the production `syncMail` OOM ("Worker exceeded memory
// limit.", operation-service, 128 MB isolate). Before the fix, tag heads were saved only by uncapped runs,
// so every backfill run re-pushed — and loaded in full — every message synced so far (production logged
// 100, 200, … 1100 pushed ops, then the 32 MiB RPC cap, then the OOM). This asserts no run re-pushes.
// The regression guard that runs in CI is `tag-push.test.ts`; this one is gated and prints a table.
//
// Still loaded in full every run: `Cursor.seedDedupSet` reads the newest and oldest 500 feed messages,
// so it saturates at `2 × DEFAULT_DEDUP_SEED_TAIL × message size` once the feed passes 1000.
//
//   DX_SYNC_MEMORY=1 moon run plugin-google:test -- src/operations/mail/sync/sync-memory.test.ts
//
// `DX_SYNC_MEMORY_BODY_KB` (default 60) sets the per-message HTML size; marketing mail is typically 30-150 KB.
const BODY_KB = Number.parseInt(process.env.DX_SYNC_MEMORY_BODY_KB ?? '60', 10);
const MESSAGES = Number.parseInt(process.env.DX_SYNC_MEMORY_MESSAGES ?? '1500', 10);
const RUN_CAP = 100;
const SEED_TAIL = 500;
const MB = 1024 * 1024;

/** Forces a full GC; works without `--expose-gc` on the command line. */
const collectGarbage = (() => {
  setFlagsFromString('--expose-gc');
  const gc: () => void = runInNewContext('gc');
  return () => {
    gc();
    gc();
  };
})();

/**
 * Samples a `process.memoryUsage()` metric on a timer while `run` executes, returning its peak above the
 * pre-run baseline. Defaults to `heapUsed`; attachment bytes are Node `Buffer`s that live off the V8 heap,
 * so measuring them needs `arrayBuffers`.
 */
const measurePeak = async <T>(
  run: () => Promise<T>,
  metric: 'heapUsed' | 'arrayBuffers' | 'rss' = 'heapUsed',
): Promise<{ result: T; baselineMb: number; peakMb: number }> => {
  collectGarbage();
  const baseline = process.memoryUsage()[metric];
  let peak = baseline;
  const sample = () => {
    peak = Math.max(peak, process.memoryUsage()[metric]);
  };
  const timer = setInterval(sample, 2);
  try {
    const result = await run();
    sample();
    return { result, baselineMb: baseline / MB, peakMb: (peak - baseline) / MB };
  } finally {
    clearInterval(timer);
  }
};

/** Pads each fixture message to a single-part HTML body of `kb` kilobytes (no Content-Type → decoded as HTML). */
const withHtmlBodies = (dataset: GmailDataset, kb: number): GmailDataset => ({
  ...dataset,
  messages: dataset.messages.map((message, index) => {
    const row = `<tr><td style="padding:8px;font-family:Arial,sans-serif;color:#333">Item ${index} — offer details and tracking pixels</td></tr>\n`;
    const html = `<html><body><table>${row.repeat(Math.ceil((kb * 1024) / row.length))}</table></body></html>`;
    return {
      ...message,
      payload: { ...message.payload, body: { size: html.length, data: Buffer.from(html, 'utf8').toString('base64') } },
    };
  }),
});

describe.runIf(process.env.DX_SYNC_MEMORY)('mail sync memory (production OOM repro)', { timeout: 1_800_000 }, () => {
  let builder: EchoTestBuilder;

  beforeAll(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterAll(async () => {
    await builder.close();
  });

  test('a capped backfill re-pushes nothing and its dedup seed saturates at 2 × seed tail', async ({ expect }) => {
    const now = new Date();
    const dataset = withHtmlBodies(
      generateGmailDataset({ count: MESSAGES, seed: 11, start: subDays(now, 27), end: subDays(now, 1) }),
      BODY_KB,
    );
    const { db, mailbox, binding } = await seedMailboxBinding(builder, {
      source: GMAIL_SOURCE,
      connectorId: GMAIL_CONNECTOR_ID,
      options: { syncBackDays: 29 },
    });
    const feed = mailbox.feed.target;
    invariant(feed, 'mailbox feed not loaded');
    const feedUri = Feed.getFeedUri(feed);
    invariant(feedUri, 'mailbox feed has no URI');

    // What `Cursor.seedDedupSet` loads every run, measured as the JSON that crosses the RPC on EDGE.
    const seedBytes = async () => {
      const tail = (direction: 'asc' | 'desc') =>
        db
          .query(
            Query.select(Filter.everything())
              .from(Scope.feed(feedUri))
              .orderBy(Order.natural(direction))
              .limit(SEED_TAIL),
          )
          .run();
      const [newest, oldest] = await Promise.all([tail('desc'), tail('asc')]);
      const items = [...newest, ...oldest];
      return {
        count: items.length,
        mb: items.reduce((sum, item) => sum + JSON.stringify(Obj.toJSON(item)).length, 0) / MB,
      };
    };

    const counter = { pushed: 0 };
    const services = Layer.mergeAll(countingApi(dataset, counter), ambientSyncServices(db));
    const rows: {
      run: number;
      feed: number;
      pushedOps: number;
      seedItems: number;
      seedJsonMb: number;
      peakHeapMb: number;
      retainedMb: number;
    }[] = [];
    let exit: Exit.Exit<unknown, unknown>;
    let run = 0;
    do {
      run += 1;
      const seed = await seedBytes();
      counter.pushed = 0;
      const { result, peakMb, baselineMb } = await measurePeak(() =>
        EffectEx.runPromise(
          Effect.exit(runGoogleSync({ binding: Ref.make(binding), maxMessages: RUN_CAP, now })).pipe(
            Effect.provide(services),
          ),
        ),
      );
      exit = result;
      if (Exit.isFailure(exit)) {
        expect(Process.RunAgainError.is(Cause.squash(exit.cause))).toBe(true);
      }
      collectGarbage();
      const feed = (await db.query(Query.select(Filter.everything()).from(Scope.feed(feedUri))).run()).length;
      rows.push({
        run,
        feed,
        pushedOps: counter.pushed,
        seedItems: seed.count,
        seedJsonMb: round(seed.mb),
        peakHeapMb: round(peakMb),
        retainedMb: round(process.memoryUsage().heapUsed / MB - baselineMb),
      });
    } while (Exit.isFailure(exit) && run < Math.ceil(MESSAGES / RUN_CAP) + 2);

    // eslint-disable-next-line no-console
    console.log(`\n=== mail sync memory: ${MESSAGES} messages × ${BODY_KB} KB HTML, ${RUN_CAP}/run ===`);
    // eslint-disable-next-line no-console
    console.table(rows);

    expect(Exit.isSuccess(exit)).toBe(true);
    // No tags change locally in this scenario, so nothing may be pushed back.
    expect(rows.every((row) => row.pushedOps === 0)).toBe(true);
    // The seed saturates at 2 × tail once the feed holds more than that.
    expect(rows.at(-1)?.seedItems).toBe(2 * SEED_TAIL);
  });

  // Repro of the production OOM ("Worker exceeded memory limit.", operation-service/compute-service,
  // syncMail `invokeOperation`) driven by a large attachment rather than body volume. `fetchAttachments`
  // downloads every attachment into a Buffer before anything looks at its size, and the pipeline holds a
  // commit page (10) + buffer (16) + fetch concurrency (5) of them at once, so a run pulls many copies of
  // a big attachment into the 128 MB isolate. Worse, the inline blob cap is 4 MB, so `processAttachments`
  // drops an oversized one AFTER the full download. Before the fix, peak heap scales with attachment size
  // and every attachment is fetched; after it, oversized attachments are skipped before download.
  test('a big attachment is not pulled into the isolate (OOM guard)', async ({ expect }) => {
    const now = new Date();
    const attachMb = Number.parseInt(process.env.DX_SYNC_ATTACH_MB ?? '8', 10);
    const count = Number.parseInt(process.env.DX_SYNC_ATTACH_COUNT ?? '12', 10);
    const dataset = withLargeAttachments(
      generateGmailDataset({ count, seed: 7, start: subDays(now, 10), end: subDays(now, 1) }),
      attachMb * MB,
    );
    const { db, binding } = await seedMailboxBinding(builder, {
      source: GMAIL_SOURCE,
      connectorId: GMAIL_CONNECTOR_ID,
      options: { syncBackDays: 29 },
    });
    const counter = { downloads: 0 };
    const services = Layer.mergeAll(attachmentCountingApi(dataset, counter), ambientSyncServices(db));
    // Measure `arrayBuffers`: attachment bytes are Node Buffers held off the V8 heap, so `heapUsed`
    // (dominated here by the per-run ECHO/pipeline churn) would not move with attachment size.
    const { peakMb, baselineMb } = await measurePeak(
      () =>
        EffectEx.runPromise(
          Effect.exit(
            runGoogleSync({ binding: Ref.make(binding), maxMessages: count, now }).pipe(Effect.provide(services)),
          ),
        ),
      'arrayBuffers',
    );

    // eslint-disable-next-line no-console
    console.log(`\n=== attachment OOM: ${count} messages × ${attachMb} MB attachment ===`);
    // eslint-disable-next-line no-console
    console.table([
      { attachMb, count, downloads: counter.downloads, peakAttachMb: round(peakMb), baselineMb: round(baselineMb) },
    ]);

    // Oversized attachments are skipped before download, so nothing is fetched and the off-heap buffer
    // peak does not scale with attachment size (before the fix: `downloads === count` and peak ≈
    // fetch concurrency × attachMb).
    expect(counter.downloads).toBe(0);
    expect(peakMb).toBeLessThan(attachMb * 2);
  });
});

/** Mock Gmail that counts the message ids each run pushes tag changes for (`batchModify`). */
const countingApi = (dataset: GmailDataset, counter: { pushed: number }): Layer.Layer<GoogleMailApi> =>
  Layer.effect(
    GoogleMailApi,
    Effect.gen(function* () {
      const inner = yield* GoogleMailApi;
      return GoogleMailApi.of({
        ...inner,
        batchModifyMessages: (userId, messageIds, labels) => {
          counter.pushed += messageIds.length;
          return inner.batchModifyMessages(userId, messageIds, labels);
        },
      });
    }),
  ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));

/**
 * Rewrites every message to a multipart payload — a `text/html` body part (so the message still decodes)
 * plus one attachment part — and registers `sizeBytes` of attachment data in the dataset, so a run must
 * download `sizeBytes` per message. One shared base64 blob keeps the fixture small; `getAttachment` hands
 * out the same body each call and `fetchAttachments` decodes a fresh Buffer per message.
 */
const withLargeAttachments = (dataset: GmailDataset, sizeBytes: number): GmailDataset => {
  const data = Buffer.alloc(sizeBytes, 0x61).toString('base64');
  const attachments: Record<string, GoogleMail.MessagePartBody> = { ...dataset.attachments };
  const messages = dataset.messages.map((message) => {
    const attachmentId = `att-${message.id}`;
    attachments[attachmentId] = { size: sizeBytes, data };
    return {
      ...message,
      payload: {
        ...message.payload,
        parts: [
          { mimeType: 'text/html', body: message.payload.body ?? { size: 0, data: '' } },
          { mimeType: 'application/pdf', filename: 'big.pdf', body: { size: sizeBytes, attachmentId } },
        ],
      },
    };
  });
  return { ...dataset, messages, attachments };
};

/** Mock Gmail that counts attachment downloads, so a test can assert oversized ones are never fetched. */
const attachmentCountingApi = (dataset: GmailDataset, counter: { downloads: number }): Layer.Layer<GoogleMailApi> =>
  Layer.effect(
    GoogleMailApi,
    Effect.gen(function* () {
      const inner = yield* GoogleMailApi;
      return GoogleMailApi.of({
        ...inner,
        getAttachment: (userId, messageId, attachmentId) => {
          counter.downloads += 1;
          return inner.getAttachment(userId, messageId, attachmentId);
        },
      });
    }),
  ).pipe(Layer.provide(GoogleMailApi.mock(dataset)));

const round = (value: number): number => Math.round(value * 10) / 10;
