//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, type Type } from '@dxos/echo';
import * as Subscription from '@dxos/plugin-magazine/Subscription';

import { Finance } from '#types';

import { TICKERS } from '../pipeline/tickers.ts';
import * as FinanceSpace from '../store/finance-space.ts';
import { FILERS, companyReports, insiderTrades, latestHoldings, loadCiks } from './edgar.ts';
import { houseFilings } from './house.ts';
import { dailyBars, shortVolume } from './market-data.ts';
import { type FeedSpecsOptions, type TextFamily, feedSpecs, fetchFeed } from './rss.ts';
import { storyKey } from './text-item.ts';

/** What one source fetch yielded. */
export type SourceResult = {
  /** The ECHO feed it wrote to. */
  readonly feed: string;
  /** The upstream feed, file or endpoint. */
  readonly source: string;
  readonly fetched: number;
  readonly added: number;
  readonly error?: string;
};

/** The source groups an ingest can run. */
export const SOURCE_GROUPS = ['text', 'edgar', 'market', 'house'] as const;
export type SourceGroup = (typeof SOURCE_GROUPS)[number];

/** Options for {@link ingest}. */
export type IngestOptions = FeedSpecsOptions & {
  /** ISO day the structured sources read back to (default 31 days ago). */
  readonly since?: string;
  /** Which source groups run (default all). */
  readonly only?: ReadonlyArray<SourceGroup>;
  /** Called with each source's result as it lands. */
  readonly onResult?: (result: SourceResult) => void;
};

const daysAgo = (days: number): string => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * Ingests every keyless source into its ECHO feed, deduped on each item's foreign key (and, for posts, on the story,
 * since one article reaches several feeds): text feeds become magazine posts, structured data becomes observations. A
 * source that fails is reported and skipped. Reruns add only what is new.
 */
export const ingest = (options: IngestOptions = {}): Effect.Effect<SourceResult[], never, Database.Service> =>
  Effect.gen(function* () {
    const since = options.since ?? daysAgo(31);
    const only = new Set<SourceGroup>(options.only ?? SOURCE_GROUPS);
    const results: SourceResult[] = [];
    const report = (result: SourceResult) => {
      results.push(result);
      options.onResult?.(result);
    };

    /** Runs one fetch and appends what it yielded to the named feed. */
    const run = <T extends Type.AnyObj>(
      feedName: string,
      source: string,
      type: T,
      fetch: Effect.Effect<ReadonlyArray<Type.InstanceType<T>>, { readonly message: string }>,
      alsoKeyedBy?: (item: Type.InstanceType<T>) => string[],
    ) =>
      Effect.gen(function* () {
        const feed = yield* FinanceSpace.feedFor(feedName);
        const outcome = yield* fetch.pipe(Effect.result);
        if (outcome._tag === 'Failure') {
          report({ feed: feedName, source, fetched: 0, added: 0, error: outcome.failure.message });
          return;
        }
        const added = yield* FinanceSpace.appendNew(feed, type, outcome.success, alsoKeyedBy);
        report({ feed: feedName, source, fetched: outcome.success.length, added });
      });

    if (only.has('text')) {
      const fetchedAt = new Date().toISOString();
      for (const spec of feedSpecs(options)) {
        yield* run<typeof Subscription.Post>(
          spec.family satisfies TextFamily,
          spec.id,
          Subscription.Post,
          fetchFeed(spec, fetchedAt),
          (post) => [storyKey({ title: post.title ?? '', publisher: post.author ?? '' })],
        );
        // Google News and Reddit throttle bursts.
        yield* Effect.sleep(spec.family === 'reddit' ? '15 seconds' : '300 millis');
      }
    }

    if (only.has('edgar')) {
      const ciks = yield* loadCiks().pipe(Effect.result);
      if (ciks._tag === 'Failure') {
        report({
          feed: 'sec-filings',
          source: 'company_tickers.json',
          fetched: 0,
          added: 0,
          error: ciks.failure.message,
        });
      } else {
        for (const { ticker } of TICKERS) {
          const cik = ciks.success.get(ticker);
          if (!cik) {
            report({ feed: 'sec-filings', source: ticker, fetched: 0, added: 0, error: 'no CIK' });
            continue;
          }
          yield* run(
            'sec-filings',
            `${ticker} 8-K/10-Q/10-K/S-1`,
            Finance.Observation,
            companyReports(cik, ticker, since),
          );
          yield* run('sec-insider-trades', `${ticker} Form 4`, Finance.Observation, insiderTrades(cik, since));
        }
        for (const filer of FILERS) {
          yield* run('sec-13f', `${filer.name} 13F`, Finance.Observation, latestHoldings(filer));
        }
      }
    }

    if (only.has('market')) {
      for (const { ticker } of TICKERS) {
        yield* run('prices', `${ticker} daily`, Finance.Observation, dailyBars(ticker));
        yield* Effect.sleep('300 millis');
      }
      // FINRA publishes trading days only.
      const days = Array.from({ length: 45 }, (_, index) => daysAgo(index + 1)).filter(
        (day) => day >= since && ![0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay()),
      );
      for (const day of days) {
        yield* run('finra-short-volume', day, Finance.Observation, shortVolume(day));
      }
    }

    if (only.has('house')) {
      const year = new Date().getUTCFullYear();
      yield* run('house-disclosures', `${year}FD.zip`, Finance.Observation, houseFilings(year, since));
    }

    return results;
  });

/** The feeds holding text items, which extraction reads through the model. */
export const TEXT_FEEDS: ReadonlyArray<TextFamily> = ['news', 'press-releases', 'central-banks', 'reddit', 'crypto'];

/** The feeds holding structured rows, which become facts without a model. */
export const DATA_FEEDS: ReadonlyArray<string> = [
  'sec-filings',
  'sec-insider-trades',
  'sec-13f',
  'prices',
  'finra-short-volume',
  'house-disclosures',
];
