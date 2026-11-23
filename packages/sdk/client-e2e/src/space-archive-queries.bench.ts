//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { afterAll, bench, describe, vi } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { createInitializedClientsWithContext } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { Filter, Query, Scope } from '@dxos/echo';
import { queryMetrics } from '@dxos/echo-client';
import { fixturePath } from '@dxos/fixtures';
import { DXN } from '@dxos/keys';

//
// The queries Composer runs, against a real space archive, which is never committed: `DX_SPACE_ARCHIVE` names a
// `.tar` exported from Composer (anonymize one with `client-services/scripts/anonymize-space-archive.ts`), and
// without it the suite reads the private `space-archive-composer` fixture, an anonymized Composer space (see the
// `private-fixtures` skill), or is skipped when that has not been pulled. `DX_SPACE_ARCHIVE_FEED` and
// `DX_SPACE_ARCHIVE_CHAT_FEED` name the feed ids the feed queries are scoped to; the defaults are that fixture's.
//
//   moon run fixtures:pull -- space-archive-composer --scope agents
//   pnpm exec vitest bench --run src/space-archive-queries.bench.ts
//
// The `run:` rows time one query alone. The `burst:` rows subscribe every query at once, as a view opening does:
// `burst: cheapest answer` ends when the cheapest query has answered, which is the time a cheap query waits behind
// the others, and `burst: every answer` when all have. `afterAll` prints the execution time `queryMetrics` recorded
// for each query, so a gap between that and a row is time spent queued.
//

// A real archive takes longer to import than the client's default allowance.
vi.mock('@dxos/client-protocol', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dxos/client-protocol')>()),
  IMPORT_SPACE_TIMEOUT: 30 * 60_000,
}));

const ARCHIVE_PATH = process.env.DX_SPACE_ARCHIVE ?? fixturePath('space-archive-composer', { extension: 'tar' });
const FEED_ID = process.env.DX_SPACE_ARCHIVE_FEED ?? '01M5V6F7A7K6N3RY0QZR891BMG';
const CHAT_FEED_ID = process.env.DX_SPACE_ARCHIVE_CHAT_FEED ?? '01M5V4JZH2T2MZ3K7G88MGVTA5';
const ANSWER_TIMEOUT_MS = 60_000;
/** How often a burst checks for answers; it bounds the burst rows' resolution. */
const ANSWER_POLL_MS = 1;
const RUN_OPTIONS = { time: 1_000, warmupIterations: 3 };
// Every burst iteration subscribes the whole set; a small fixed sample count keeps the rows bounded.
const BURST_OPTIONS = { iterations: 10, time: 0, warmupIterations: 2, warmupTime: 0 };

const type = (typename: string, version: string) => Filter.type(DXN.make(typename, version));

const ctx = new Context();

/** Imports the archive into a fresh client and waits until the index holds all of it. */
const openArchive = async (path: string): Promise<Space> => {
  const [client] = await createInitializedClientsWithContext(ctx, 1, { storage: true });
  const begin = performance.now();
  const space = await client.spaces.import({ filename: basename(path), contents: new Uint8Array(readFileSync(path)) });
  await space.waitUntilReady();
  await space.db.flush({ indexes: true });
  // eslint-disable-next-line no-console
  console.log(`imported and indexed in ${(performance.now() - begin).toFixed(0)} ms`);
  return space;
};

const space = ARCHIVE_PATH ? await openArchive(ARCHIVE_PATH) : undefined;

/** Composer's queries, cheapest first by their execution in the archive this suite was written against. */
const makeQueries = (space: Space): { label: string; query: Query.Any }[] => {
  const spaceScope = Scope.space({ id: space.id });
  const feed = (feedId: string) => Scope.feed(`echo://${space.id}/${feedId}`);
  return [
    { label: 'empty', query: Query.select(Filter.not(Filter.everything())).from(spaceScope) },
    {
      label: 'feed: contextBinding',
      query: Query.select(type('org.dxos.type.contextBinding', '0.1.0')).from(feed(FEED_ID)),
    },
    { label: 'feed: message', query: Query.select(type('org.dxos.type.message', '0.1.0')).from(feed(FEED_ID)) },
    { label: 'feed: alarm', query: Query.select(type('org.dxos.type.alarm', '0.1.0')).from(feed(FEED_ID)) },
    {
      label: 'feed: message or alarm',
      query: Query.select(Filter.or(type('org.dxos.type.message', '0.1.0'), type('org.dxos.type.alarm', '0.1.0'))).from(
        feed(CHAT_FEED_ID),
      ),
    },
    { label: 'type: skill', query: Query.select(type('org.dxos.type.skill', '0.2.0')).from(spaceScope) },
    { label: 'type: taskSet', query: Query.select(type('org.dxos.type.taskSet', '0.4.0')).from(spaceScope) },
    {
      label: 'type: task, all feeds',
      query: Query.select(type('org.dxos.type.task', '0.6.0')).from(
        Scope.space({ id: space.id, includeAllFeeds: true }),
      ),
    },
    { label: 'everything', query: Query.select(Filter.everything()).from(spaceScope) },
  ];
};

/** Subscribes every query and resolves once the first `awaited` of them have answered; the subscriptions are released after. */
const burst = async (space: Space, queries: readonly Query.Any[], awaited: number): Promise<void> => {
  const results = queries.map((query) => space.db.query(query));
  const unsubscribes = results.map((result) => result.subscribe());
  try {
    const watched = results.slice(0, awaited);
    // Polled: an answer that leaves the result unchanged (an empty one, say) emits no event.
    await asyncTimeout(
      (async () => {
        while (watched.some((result) => result.sources.some((source) => source.state !== 'answered'))) {
          // A failed source never answers, and timing it as if it had would report a wait that never ended.
          if (watched.some((result) => result.sources.some((source) => source.state === 'failed'))) {
            throw new Error('a query source failed during the burst');
          }
          await sleep(ANSWER_POLL_MS);
        }
      })(),
      ANSWER_TIMEOUT_MS,
    );
  } finally {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  }
};

describe.runIf(space)('space archive queries', () => {
  // Collection still runs the callback of a skipped suite.
  if (!space) {
    return;
  }
  const queries = makeQueries(space);
  const all = queries.map(({ query }) => query);

  afterAll(async () => {
    const lines = queries.map(({ label, query }) => {
      const metrics = queryMetrics.getMetrics().find((entry) => entry.query === Query.pretty(query));
      const average = metrics && metrics.executions > 0 ? metrics.totalTime / metrics.executions : NaN;
      return `${average.toFixed(1).padStart(9)} ${String(metrics?.lastCount ?? 0).padStart(6)}  ${label}`;
    });
    // eslint-disable-next-line no-console
    console.log(`\n exec avg  items  query\n${lines.join('\n')}`);
    await ctx.dispose();
  });

  for (const { label, query } of queries) {
    bench(
      `run: ${label}`,
      async () => {
        await space.db.query(query).run();
      },
      RUN_OPTIONS,
    );
  }

  bench('burst: cheapest answer', () => burst(space, all, 1), BURST_OPTIONS);
  bench('burst: every answer', () => burst(space, all, all.length), BURST_OPTIONS);
});
