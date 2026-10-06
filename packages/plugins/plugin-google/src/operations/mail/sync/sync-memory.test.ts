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
import { ambientSyncServices, seedMailboxBinding } from '@dxos/plugin-inbox/testing/sync';

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
  const gc = runInNewContext('gc') as () => void;
  return () => {
    gc();
    gc();
  };
})();

/** Samples `heapUsed` on a timer while `run` executes, returning its peak above the pre-run baseline. */
const measurePeak = async <T>(run: () => Promise<T>): Promise<{ result: T; baselineMb: number; peakMb: number }> => {
  collectGarbage();
  const baseline = process.memoryUsage().heapUsed;
  let peak = baseline;
  const sample = () => {
    peak = Math.max(peak, process.memoryUsage().heapUsed);
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
    const feedUri = Feed.getFeedUri(mailbox.feed.target!)!;

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
    expect(rows.at(-1)!.seedItems).toBe(2 * SEED_TAIL);
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

const round = (value: number): number => Math.round(value * 10) / 10;
