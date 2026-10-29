//
// Copyright 2026 DXOS.org
//

import { type QueryMetrics } from '@dxos/echo-client';

/** Milliseconds above which a duration reads as a warning. */
export const SLOW_TIME = 250;

/** Figures for a `StatCard.Row` value; the unit goes in the row's `unit`. */
export const Unit = {
  KB: (value?: number) => ((value ?? 0) / 1_000).toFixed(2),
  MB: (value?: number) => ((value ?? 0) / 1_000_000).toFixed(1),
  ms: (value?: number) => (value ?? 0).toFixed(value !== undefined && value < 10 ? 1 : 0),
  percent: (value?: number) => ((value ?? 0) * 100).toFixed(1),
};

/** Suffix naming the averaging window of a rate, e.g. ` (10s)`. */
export const rateInterval = (seconds?: number): string => (seconds ? ` (${seconds}s)` : '');

/** Milliseconds above which a query reads as slow (amber); above {@link SLOW_TIME} it reads as an error. */
export const SLUGGISH_QUERY_TIME = 50;

/** Text colour for a query duration: amber when sluggish, red when slow. */
export const queryTimeClassName = (time: number): string | undefined =>
  time > SLOW_TIME ? 'text-error-text' : time > SLUGGISH_QUERY_TIME ? 'text-warning-text' : undefined;

/** Mean execution time of a query (ms); zero before it has executed. */
export const averageQueryTime = ({ totalTime, executions }: QueryMetrics): number =>
  executions > 0 ? totalTime / executions : 0;

/** Times a query was fired: one-shot runs plus reactive subscriptions. */
export const queryFiredCount = ({ runs, subscriptions }: QueryMetrics): number => runs + subscriptions;

/** Characters kept of an object id or space key, enough to tell rows apart. */
const KEY_CHARS = 4;

/** A ULID object id: its leading characters are a timestamp shared by ids created together, so its tail is kept. */
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * Query text a narrow column can show: the `Query.select(...)` wrapper every query shares is dropped, object ids keep
 * their last characters and space keys their first, and a `.from()` of one space loses its array and flag options, e.g.
 * `Filter.type(id: [1ZR3]).from({ space: "BPBG" })`.
 */
export const shortQueryText = (query: string): string =>
  unwrapSelect(query)
    .replace(/\b[0-9A-Z]{20,}\b/g, (key) => (ULID.test(key) ? key.slice(-KEY_CHARS) : key.slice(0, KEY_CHARS)))
    .replace(/,\s*\w+:\s*(?:true|false)\b/g, '')
    .replace(/\.from\(\[\s*(\{[^{}]*\})\s*\]\)/g, '.from($1)');

/** The argument of a leading `Query.select(...)` followed by the rest of the chain. */
const unwrapSelect = (query: string): string => {
  const prefix = 'Query.select(';
  if (!query.startsWith(prefix)) {
    return query;
  }
  let depth = 1;
  for (let index = prefix.length; index < query.length; index++) {
    const char = query[index];
    if (char === '(') {
      depth++;
    } else if (char === ')' && --depth === 0) {
      return query.slice(prefix.length, index) + query.slice(index + 1);
    }
  }
  return query;
};
