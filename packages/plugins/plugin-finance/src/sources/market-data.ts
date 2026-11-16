//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Finance } from '#types';

import { TICKERS, canonicalTicker } from '../pipeline/tickers.ts';
import { SourceError, getText, isNotFound } from './http.ts';

/** The foreign-key source of daily bars (Yahoo Finance's keyless chart endpoint; Stooq now demands a JS challenge). */
export const PRICE_SOURCE = 'query1.finance.yahoo.com';

/** The foreign-key source of FINRA's daily short-sale volume files. */
export const FINRA_SOURCE = 'cdn.finra.org';

const Nullable = Schema.Array(Schema.NullOr(Schema.Number));

const Chart = Schema.Struct({
  chart: Schema.Struct({
    result: Schema.Array(
      Schema.Struct({
        meta: Schema.Struct({
          currentTradingPeriod: Schema.Struct({
            regular: Schema.Struct({ start: Schema.Number, end: Schema.Number }),
          }).pipe(Schema.optional),
        }).pipe(Schema.optional),
        timestamp: Schema.Array(Schema.Number),
        indicators: Schema.Struct({
          quote: Schema.Array(
            Schema.Struct({ open: Nullable, high: Nullable, low: Nullable, close: Nullable, volume: Nullable }),
          ),
        }),
      }),
    ),
  }),
});

/** Without session metadata, a bar this recent may belong to a session still open. */
const PROVISIONAL_MS = 24 * 60 * 60 * 1000;

/**
 * Daily OHLCV bars from a chart response, with each bar's return on the previous close. Bars with no close (a halt)
 * are left out, and so is the bar of a session still open at `now` (epoch ms): its close is the last trade, and rows
 * are deduped on `ticker@date`, so storing it would keep the final close from ever replacing it. Without the
 * response's session metadata, any bar from the last 24 hours counts as open.
 */
export const parseChart = (ticker: string, json: string, now = Date.now()): Finance.Observation[] => {
  const decoded = Schema.decodeUnknownSync(Schema.fromJsonString(Chart))(json);
  const [result] = decoded.chart.result;
  if (!result) {
    return [];
  }
  const [quote] = result.indicators.quote;
  const session = result.meta?.currentTradingPeriod?.regular;
  const isOpen = (time: number) =>
    session !== undefined ? time >= session.start && now < session.end * 1000 : now - time * 1000 < PROVISIONAL_MS;
  const observations: Finance.Observation[] = [];
  let previous: number | undefined;
  result.timestamp.forEach((time, index) => {
    const close = quote?.close[index];
    if (close == null || isOpen(time)) {
      return;
    }
    const date = new Date(time * 1000).toISOString().slice(0, 10);
    const values: Record<string, number> = { close: Math.round(close * 100) / 100 };
    for (const [name, series] of [
      ['open', quote.open],
      ['high', quote.high],
      ['low', quote.low],
      ['volume', quote.volume],
    ] as const) {
      const value = series[index];
      if (value != null) {
        values[name] = name === 'volume' ? value : Math.round(value * 100) / 100;
      }
    }
    if (previous !== undefined) {
      values.changePercent = Math.round(((close - previous) / previous) * 10_000) / 100;
    }
    previous = close;
    observations.push(
      Finance.makeObservation({
        key: { source: PRICE_SOURCE, id: `${ticker}@${date}` },
        kind: 'price',
        symbol: ticker,
        date,
        values,
      }),
    );
  });
  return observations;
};

/** A ticker's daily bars over `range` (`3mo`). */
export const dailyBars = (ticker: string, range = '3mo'): Effect.Effect<Finance.Observation[], SourceError> =>
  getText(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker.replace('.', '-'))}?range=${range}&interval=1d`,
  ).pipe(
    Effect.flatMap((json) =>
      Effect.try({
        try: () => parseChart(ticker, json),
        catch: (cause) => new SourceError({ message: `Unrecognized chart for ${ticker}`, cause }),
      }),
    ),
  );

const KNOWN = new Set(TICKERS.map(({ ticker }) => ticker));

/**
 * One day's FINRA consolidated short-sale volume file (`Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market`),
 * kept for the known listings.
 */
export const parseShortVolume = (text: string, tickers: ReadonlySet<string> = KNOWN): Finance.Observation[] =>
  text.split('\n').flatMap((line) => {
    const [day, rawSymbol, short, exempt, total] = line.trim().split('|');
    if (!day || !/^\d{8}$/.test(day) || !rawSymbol) {
      return [];
    }
    const symbol = canonicalTicker(rawSymbol);
    const shortVolume = Number(short);
    const totalVolume = Number(total);
    if (!tickers.has(symbol) || !Number.isFinite(shortVolume) || !Number.isFinite(totalVolume) || totalVolume <= 0) {
      return [];
    }
    const date = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
    return [
      Finance.makeObservation({
        key: { source: FINRA_SOURCE, id: `${symbol}@${date}` },
        kind: 'short-volume',
        symbol,
        date,
        values: {
          shortVolume: Math.round(shortVolume),
          shortExemptVolume: Math.round(Number(exempt) || 0),
          totalVolume: Math.round(totalVolume),
          shortRatio: Math.round((shortVolume / totalVolume) * 1000) / 1000,
        },
      }),
    ];
  });

/** The short-volume rows of one day (ISO), or none when FINRA has no file for it (weekends, holidays). */
export const shortVolume = (date: string): Effect.Effect<Finance.Observation[], SourceError> =>
  getText(`https://cdn.finra.org/equity/regsho/daily/CNMSshvol${date.replace(/-/g, '')}.txt`).pipe(
    Effect.map((text) => parseShortVolume(text)),
    Effect.catchIf(isNotFound, () => Effect.succeed([])),
  );
