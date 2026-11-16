//
// Copyright 2026 DXOS.org
//
// @vitest-environment node

// Fetches a month of finance news headlines from public RSS feeds (Google News searches by week and by ticker, Yahoo
// Finance per ticker, CNBC, MarketWatch, Nasdaq, Seeking Alpha) into a JSON-lines item store. Reruns resume: items
// already stored (same guid/link, or same outlet and headline) are skipped. No model calls.
//   [FINANCE_DIR=~/.local/share/dxos/magazine-pipeline/finance] [FINANCE_WEEKS=5] [FINANCE_TICKERS=44]
//   [FINANCE_TOPICS=8]  moon run plugin-magazine:finance-fetch
//
// It writes to a persistent location, so it runs only from its moon task (which sets FINANCE_PIPELINE).

import * as Effect from 'effect/Effect';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { defaultFeeds, fetchFeed } from './feeds.ts';
import { ItemStore } from './item-store.ts';
import { financeDir, perDay, runLog } from './report.ts';

const dir = financeDir();
const numberFrom = (value: string | undefined): number | undefined => (value ? Number(value) : undefined);

describe('finance fetch', () => {
  test.skipIf(!process.env.FINANCE_PIPELINE)(
    'fetches a month of finance headlines into the item store',
    async ({ expect }) => {
      const log = runLog(join(dir, 'run.log'));
      const store = new ItemStore(join(dir, 'items.jsonl'));
      const feeds = defaultFeeds({
        weeks: numberFrom(process.env.FINANCE_WEEKS),
        tickers: numberFrom(process.env.FINANCE_TICKERS),
        topics: numberFrom(process.env.FINANCE_TOPICS),
      });
      const before = store.size;
      const fetchedAt = new Date().toISOString();
      log(`\n== fetch ${fetchedAt}: ${feeds.length} feeds, ${before} items stored`);

      const results = await EffectEx.runPromise(
        Effect.forEach(
          feeds,
          (feed) =>
            fetchFeed(feed, fetchedAt).pipe(
              Effect.map((items) => ({
                feed,
                fetched: items.length,
                added: store.add(items).length,
                error: undefined,
              })),
              Effect.catch((error) => Effect.succeed({ feed, fetched: 0, added: 0, error: error.message })),
              // Google News throttles bursts; a short pause between requests keeps every search answering.
              Effect.tap(() => Effect.sleep('300 millis')),
            ),
          { concurrency: 2 },
        ),
      );

      const failed = results.filter(({ error }) => error);
      for (const { feed, fetched, added, error } of results) {
        log(
          `  ${feed.id.padEnd(48)} ${error ? `FAILED ${error}` : `${String(fetched).padStart(4)} fetched ${String(added).padStart(4)} new`}`,
        );
      }
      log(`items:   ${store.size} (${store.size - before} new), ${failed.length} feed(s) failed`);
      const days = perDay(store.items);
      log(`days:    ${days.length} (${days[0]?.[0]} … ${days.at(-1)?.[0]})`);
      log(`  ${days.map(([day, count]) => `${day.slice(5)}:${count}`).join(' ')}`);
      const publishers = new Map<string, number>();
      for (const item of store.items) {
        publishers.set(item.publisher, (publishers.get(item.publisher) ?? 0) + 1);
      }
      log(
        `outlets: ${publishers.size}; top ${[...publishers.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 12)
          .map(([name, count]) => `${name} ${count}`)
          .join(', ')}`,
      );
      expect(store.size).toBeGreaterThan(0);
    },
    30 * 60_000,
  );
});
