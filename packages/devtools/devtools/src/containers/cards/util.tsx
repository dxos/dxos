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

/**
 * Query text without the boilerplate every query shares (`Query.select(…)`, `Filter.`), so the part
 * that tells queries apart survives truncation in a narrow column.
 */
export const shortQueryText = (query: string): string =>
  query
    .replace(/^Query\.select\(([\s\S]*)\)$/, '$1')
    .replace(/^Filter\.type\(([^(),]+)\)/, '$1')
    .replace(/\bFilter\./g, '');
