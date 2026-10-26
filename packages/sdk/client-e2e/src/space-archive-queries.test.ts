//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { describe, onTestFinished, test, vi } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { createInitializedClientsWithContext } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { Filter, Query, Scope } from '@dxos/echo';
import { queryMetrics } from '@dxos/echo-client';
import { DXN } from '@dxos/keys';

//
// Query latency against a real space archive, which the test never commits: `DX_SPACE_ARCHIVE` names a `.tar`
// exported from Composer, and the suite is skipped without it. `DX_SPACE_ARCHIVE_FEED` and
// `DX_SPACE_ARCHIVE_CHAT_FEED` name feed ids in that archive to scope the feed queries to.
//
//   DX_SPACE_ARCHIVE=/path/space.tar moon run client-e2e:test -- src/space-archive-queries.test.ts
//
// Each scenario prints, per query, the wall-clock time from subscribing (or calling `run()`) to the answer
// next to the execution time `queryMetrics` records for it, so a gap between the two is time spent queued.
//

// A real archive takes longer to import than the client's default allowance.
vi.mock('@dxos/client-protocol', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dxos/client-protocol')>()),
  IMPORT_SPACE_TIMEOUT: 30 * 60_000,
}));

const ARCHIVE_PATH = process.env.DX_SPACE_ARCHIVE;
const FEED_ID = process.env.DX_SPACE_ARCHIVE_FEED ?? '01M5V6F7A7K6N3RY0QZR891BMG';
const CHAT_FEED_ID = process.env.DX_SPACE_ARCHIVE_CHAT_FEED ?? '01M5V4JZH2T2MZ3K7G88MGVTA5';
const ROUNDS = Number(process.env.DX_SPACE_ARCHIVE_ROUNDS ?? 5);
const ANSWER_TIMEOUT_MS = 60_000;

type Row = { query: string; count: number; wall: number[]; exec: number[] };

const type = (typename: string, version: string) => Filter.type(DXN.make(typename, version));

const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted.length === 0 ? NaN : sorted[Math.floor(sorted.length / 2)];
};

const print = (title: string, rows: Row[]) => {
  const lines = rows
    .map(
      (row) =>
        `${median(row.wall).toFixed(1).padStart(9)} ${Math.max(...row.wall)
          .toFixed(1)
          .padStart(9)} ` + `${median(row.exec).toFixed(1).padStart(9)} ${String(row.count).padStart(6)}  ${row.query}`,
    )
    .join('\n');
  // eslint-disable-next-line no-console
  console.log(`\n## ${title}\n wall p50  wall max  exec p50  items  query\n${lines}`);
};

/** The execution time `queryMetrics` recorded for the query's latest timed run. */
const lastExecution = (query: Query.Any) =>
  queryMetrics.getMetrics().find((entry) => entry.query === Query.pretty(query))?.lastTime ?? NaN;

describe.runIf(ARCHIVE_PATH)('space archive queries', () => {
  test('latency of the queries Composer runs', { timeout: 30 * 60_000 }, async () => {
    const ctx = new Context();
    onTestFinished(async () => {
      await ctx.dispose();
    });
    const [client] = await createInitializedClientsWithContext(ctx, 1, { storage: true });

    const contents = readFileSync(ARCHIVE_PATH!);
    let begin = performance.now();
    const space = await client.spaces.import({ filename: basename(ARCHIVE_PATH!), contents: new Uint8Array(contents) });
    await space.waitUntilReady();
    await space.db.flush({ indexes: true });
    // eslint-disable-next-line no-console
    console.log(`imported and indexed in ${(performance.now() - begin).toFixed(0)} ms`);

    const feed = (feedId: string) => Scope.feed(`echo://${space.id}/${feedId}`);
    const everything = await space.db.query(Query.select(Filter.everything())).run();
    const parentId = everything.find((object) => object.id)?.id;

    const queries: Query.Any[] = [
      Query.select(type('org.dxos.type.contextBinding', '0.1.0')).from(feed(FEED_ID)),
      Query.select(type('org.dxos.type.message', '0.1.0')).from(feed(FEED_ID)),
      Query.select(type('org.dxos.type.alarm', '0.1.0')).from(feed(FEED_ID)),
      Query.select(Filter.or(type('org.dxos.type.message', '0.1.0'), type('org.dxos.type.alarm', '0.1.0'))).from(
        feed(CHAT_FEED_ID),
      ),
      Query.select(type('org.dxos.type.taskSet', '0.4.0')).from(Scope.space({ id: space.id })),
      Query.select(type('org.dxos.type.skill', '0.2.0')).from(Scope.space({ id: space.id })),
      Query.select(type('org.dxos.type.task', '0.6.0')).from(Scope.space({ id: space.id, includeAllFeeds: true })),
      Query.select(Filter.not(Filter.everything())).from(Scope.space({ id: space.id })),
      Query.select(Filter.everything()).from(Scope.space({ id: space.id })),
      ...(parentId
        ? [
            Query.select(Filter.id(parentId))
              .children()
              .from(Scope.space({ id: space.id })),
          ]
        : []),
    ];
    const rows = () => queries.map((query): Row => ({ query: Query.pretty(query), count: 0, wall: [], exec: [] }));

    // One query at a time: the wall clock is the round trip with nothing else queued.
    const sequential = rows();
    for (let round = 0; round < ROUNDS; round++) {
      for (const [index, query] of queries.entries()) {
        begin = performance.now();
        const results = await space.db.query(query).run();
        sequential[index].wall.push(performance.now() - begin);
        sequential[index].exec.push(lastExecution(query));
        sequential[index].count = results.length;
      }
    }
    print('one-shot, one at a time', sequential);

    // Every query subscribed at once, as a Composer view opening does: the wall clock includes the queue.
    const burst = rows();
    for (let round = 0; round < ROUNDS; round++) {
      const started = performance.now();
      const unsubscribes: (() => void)[] = [];
      await Promise.all(
        queries.map(async (query, index) => {
          const result = space.db.query(query);
          unsubscribes.push(result.subscribe());
          // Polled: an answer that leaves the result unchanged (an empty one, say) emits no event.
          await asyncTimeout(
            (async () => {
              while (result.sources.some((source) => source.state === 'pending')) {
                await sleep(1);
              }
            })(),
            ANSWER_TIMEOUT_MS,
          );
          const count = result.results.length;
          burst[index].wall.push(performance.now() - started);
          burst[index].exec.push(lastExecution(query));
          burst[index].count = count;
        }),
      );
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    }
    print('reactive, all subscribed at once', burst);
  });
});
