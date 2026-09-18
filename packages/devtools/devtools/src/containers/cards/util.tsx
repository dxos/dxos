//
// Copyright 2026 DXOS.org
//

import { type QueryInfo, removeEmpty } from '../../hooks/index.ts';

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

/** Groups queries by their filter shape (options and type identity stripped), keyed by the shape's JSON. */
export const groupQueriesByFilter = (queries: QueryInfo[] = []): Map<string, QueryInfo[]> =>
  queries.reduce((acc, query) => {
    const raw = removeEmpty(query.filter);
    delete raw.options;
    raw.type = raw.type?.itemId;
    const key = JSON.stringify(raw);
    acc.set(key, [...(acc.get(key) ?? []), query]);
    return acc;
  }, new Map<string, QueryInfo[]>());
