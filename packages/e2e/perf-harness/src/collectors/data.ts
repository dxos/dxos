//
// Copyright 2026 DXOS.org
//

import { type Attached } from '../cdp.ts';
import { type DataCounters } from '../types.ts';

/**
 * Globals the app's data-layer probes publish under, duplicated from `@dxos/util`'s
 * `WORK_COUNTERS_GLOBAL` and `@dxos/sql-sqlite`'s `SQLITE_IO_GLOBAL` for the reason `disk.ts` gives:
 * the name crosses into another realm as text.
 */
const WORK_COUNTERS_GLOBAL = '__dxosWorkCounters';
const SQLITE_IO_GLOBAL = '__dxosSqliteIo';

/** The SQLite statement fields, renamed into the `sqlite.` namespace the work counters use. */
const SQLITE_FIELDS = [
  'selects',
  'inserts',
  'updates',
  'deletes',
  'otherStatements',
  'statementErrors',
  'rowsRead',
  'rowsChanged',
  'cacheHits',
  'cacheMisses',
] as const;

/** Both probes in one evaluation, so a realm costs one round trip per boundary. */
const EXPRESSION = `(() => {
  const work = globalThis['${WORK_COUNTERS_GLOBAL}'];
  const sqlite = globalThis['${SQLITE_IO_GLOBAL}'];
  if (typeof work !== 'function' && typeof sqlite !== 'function') {
    return null;
  }
  return JSON.stringify({
    work: typeof work === 'function' ? work() : {},
    sqlite: typeof sqlite === 'function' ? sqlite() : {},
  });
})()`;

type RemoteResult = { result?: { value?: unknown } };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Numeric entries of a parsed object, prefixed; anything else in it is ignored. */
const numbersOf = (value: unknown, prefix = ''): Record<string, number> =>
  isRecord(value)
    ? Object.fromEntries(
        Object.entries(value)
          .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
          .map(([key, number]) => [`${prefix}${key}`, number]),
      )
    : {};

/** One realm's running totals, keyed by counter name. */
export type DataReading = { name: string; counters: Record<string, number> };

/**
 * Reads every realm's data-layer counters.
 *
 * Kept per realm until the diff: a realm that appeared mid-stage contributes its whole totals, and
 * that needs to know which opening reading, if any, belongs to it.
 */
export const readData = async (targets: Attached[]): Promise<DataReading[]> => {
  const readings: DataReading[] = [];
  for (const target of targets) {
    const response = await target.cdp.trySend<RemoteResult>(
      'Runtime.evaluate',
      { expression: EXPRESSION, returnByValue: true },
      { timeoutMs: 10_000 },
    );
    const serialized = response?.result?.value;
    if (typeof serialized !== 'string') {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) {
      continue;
    }
    const sqlite = numbersOf(parsed.sqlite);
    readings.push({
      name: target.name,
      counters: {
        ...numbersOf(parsed.work),
        ...Object.fromEntries(
          SQLITE_FIELDS.filter((field) => field in sqlite).map((field) => [`sqlite.${field}`, sqlite[field]]),
        ),
      },
    });
  }
  return readings;
};

/** The stage's share of every counter, summed over realms; zero deltas are dropped. */
export const diffData = (before: DataReading[], after: DataReading[]): DataCounters => {
  const opening = new Map(before.map((reading) => [reading.name, reading.counters]));
  const counters: Record<string, number> = {};
  for (const reading of after) {
    const previous = opening.get(reading.name) ?? {};
    for (const [name, value] of Object.entries(reading.counters)) {
      const delta = value - (previous[name] ?? 0);
      if (delta !== 0) {
        counters[name] = (counters[name] ?? 0) + delta;
      }
    }
  }
  return { counters, realms: after.length };
};
