//
// Copyright 2026 DXOS.org
//

import { type LogFilter, LogLevel, parseFilter, shortLevelName, shouldLog } from '@dxos/log';

const LEVEL_LETTERS = ['T', 'D', 'V', 'I', 'W', 'E'] as const;
export type LevelLetter = (typeof LEVEL_LETTERS)[number];

const letterToLevel: Record<string, LogLevel> = Object.fromEntries(
  Object.entries(shortLevelName).map(([level, letter]) => [letter as string, Number(level) as LogLevel]),
);

export const HARD_LIMIT_ENTRIES = 1000;
export const HARD_LIMIT_TOPK = 1000;
export const HARD_LIMIT_SAMPLE = 25;
const DEFAULT_LIMIT = 100;
const DEFAULT_TOPK = 50;
const DEFAULT_SAMPLE = 3;

export type LogRecord = {
  t?: string;
  l?: string;
  m?: string;
  f?: string;
  n?: number;
  o?: string;
  c?: string;
  i?: string;
  e?: string;
};

export type GroupByKey = 'level' | 'message' | 'file' | 'tabId' | `context.${string}`;

export type AggregateMode = 'count' | 'sample' | 'firstLast';

export type QueryInput = {
  filters?: readonly string[];
  grep?: readonly string[];
  messageRegex?: string;
  since?: string | number;
  until?: string | number;
  levels?: readonly LevelLetter[];
  tabId?: string;
  select?: readonly (keyof LogRecord)[];
  groupBy?: GroupByKey;
  aggregate?: AggregateMode;
  sampleSize?: number;
  topK?: number;
  limit?: number;
  order?: 'asc' | 'desc';
  format?: 'json' | 'jsonl' | 'pretty';
  /** Forwarded to the IDB reader; ignored by runQuery. */
  dbName?: string;
};

export type GroupOutput = {
  key: string;
  count: number;
  samples?: unknown[];
  first?: string;
  last?: string;
};

export type QueryResult = {
  total: number;
  matched: number;
  elapsedMs: number;
  truncated: boolean;
  entries?: unknown[];
  groups?: GroupOutput[];
};

/**
 * `!foo` -> `-foo:trace` so parseFilter treats it as an exclude at all levels.
 * (parseFilter already handles `-` prefix; ensure a level is attached.).
 */
const normalizeFilterToken = (token: string): string => {
  let t = token.trim();
  if (t.length === 0) {
    return t;
  }
  if (t.startsWith('!')) {
    t = `-${t.slice(1)}`;
  }
  if (t.startsWith('-') && !t.includes(':')) {
    return `${t}:trace`;
  }
  return t;
};

const parseFilterGroup = (q: string): LogFilter[] => {
  const tokens = q
    .split(/,\s*/)
    .map(normalizeFilterToken)
    .filter((s) => s.length > 0);
  return parseFilter(tokens);
};

const parseTime = (value: string | number | undefined): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseRecordTime = (record: LogRecord): number | undefined => {
  if (record.t === undefined) {
    return undefined;
  }
  const parsed = Date.parse(record.t);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatField = (value: unknown): string => {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return String(value).replace(/\r?\n/g, '\\n');
};

/**
 * Re-implementation of formatLine in scripts/query-logs.mjs — keep stable for downstream tooling.
 */
export const formatPrettyLine = (record: LogRecord): string => {
  const fileLine = record.f !== undefined || record.n !== undefined ? `${record.f ?? ''}:${record.n ?? ''}` : '';
  return [
    formatField(record.t),
    formatField(record.l),
    fileLine,
    formatField(record.o),
    formatField(record.m),
    formatField(record.c),
    formatField(record.e),
  ].join(' ');
};

const projectRecord = (record: LogRecord, select: readonly (keyof LogRecord)[] | undefined): LogRecord => {
  if (!select || select.length === 0) {
    return record;
  }
  const out: LogRecord = {};
  for (const key of select) {
    if (record[key] !== undefined) {
      (out as Record<string, unknown>)[key] = record[key];
    }
  }
  return out;
};

const renderEntry = (record: LogRecord, input: QueryInput): unknown => {
  const projected = projectRecord(record, input.select);
  switch (input.format ?? 'json') {
    case 'pretty':
      return formatPrettyLine(record);
    case 'jsonl':
      return JSON.stringify(projected);
    case 'json':
    default:
      return projected;
  }
};

const getGroupKey = (record: LogRecord, groupBy: GroupByKey): string => {
  if (groupBy === 'level') {
    return record.l ?? '(none)';
  }
  if (groupBy === 'message') {
    return record.m ?? '(none)';
  }
  if (groupBy === 'file') {
    return record.f ?? '(none)';
  }
  if (groupBy === 'tabId') {
    return record.i ?? '(none)';
  }
  // context.<key>
  const path = groupBy.slice('context.'.length);
  if (record.c === undefined) {
    return '(none)';
  }
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = JSON.parse(record.c) as Record<string, unknown>;
  } catch {
    return '(none)';
  }
  const value = parsed?.[path];
  if (value === undefined || value === null) {
    return '(none)';
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
};

const clampLimit = (input: QueryInput): number => {
  const requested = input.limit ?? DEFAULT_LIMIT;
  return Math.max(0, Math.min(requested, HARD_LIMIT_ENTRIES));
};

const clampTopK = (input: QueryInput): number => {
  const requested = input.topK ?? DEFAULT_TOPK;
  return Math.max(1, Math.min(requested, HARD_LIMIT_TOPK));
};

const clampSampleSize = (input: QueryInput): number => {
  const requested = input.sampleSize ?? DEFAULT_SAMPLE;
  return Math.max(1, Math.min(requested, HARD_LIMIT_SAMPLE));
};

type Bucket = {
  key: string;
  count: number;
  samples?: LogRecord[];
  firstMs?: number;
  lastMs?: number;
};

/**
 * Pure query engine. Iterates rows once, applying filters then either collecting entries
 * (capped by `limit`) or aggregating into buckets (capped by `topK` after sort).
 *
 * Rows must be passed in `asc` order (oldest first); callers control ordering by reading
 * the underlying store in the desired direction.
 *
 * Throws on invalid regex sources passed via `grep` / `messageRegex` so the operation
 * surfaces it as a structured failure rather than silently returning fewer results.
 */
export const runQuery = (rows: Iterable<LogRecord>, input: QueryInput): QueryResult => {
  const start = Date.now();

  const filterGroups = (input.filters ?? []).map(parseFilterGroup);
  const greps = (input.grep ?? []).map((source, idx) => {
    try {
      return new RegExp(source);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid regex in grep[${idx}]: ${reason}`);
    }
  });
  let messageRegex: RegExp | undefined;
  if (input.messageRegex !== undefined) {
    try {
      messageRegex = new RegExp(input.messageRegex);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid regex in messageRegex: ${reason}`);
    }
  }
  const sinceMs = parseTime(input.since);
  const untilMs = parseTime(input.until);
  const allowedLetters = input.levels && input.levels.length > 0 ? new Set<string>(input.levels) : undefined;

  const limit = clampLimit(input);
  const topK = clampTopK(input);
  const sampleSize = clampSampleSize(input);

  let total = 0;
  let matched = 0;
  let truncated = false;

  const aggregating = input.groupBy !== undefined;
  const aggregate: AggregateMode = input.aggregate ?? 'count';
  const collected: LogRecord[] = [];
  const buckets = new Map<string, Bucket>();

  for (const record of rows) {
    total += 1;

    // Cheap filters first.
    if (allowedLetters && !allowedLetters.has(record.l ?? '')) {
      continue;
    }
    if (sinceMs !== undefined || untilMs !== undefined) {
      const ts = parseRecordTime(record);
      if (ts === undefined) {
        continue;
      }
      if (sinceMs !== undefined && ts < sinceMs) {
        continue;
      }
      if (untilMs !== undefined && ts > untilMs) {
        continue;
      }
    }
    if (input.tabId !== undefined && record.i !== input.tabId) {
      continue;
    }
    if (messageRegex && !messageRegex.test(record.m ?? '')) {
      continue;
    }

    if (filterGroups.length > 0) {
      const level = letterToLevel[record.l ?? ''] ?? LogLevel.INFO;
      // shouldLog only reads .level and .meta?.F on the entry, so a plain object suffices.
      const entry = {
        level,
        meta: record.f !== undefined ? { F: record.f } : undefined,
      } as unknown as Parameters<typeof shouldLog>[0];
      if (!filterGroups.some((filters) => shouldLog(entry, filters))) {
        continue;
      }
    }

    if (greps.length > 0) {
      const raw = JSON.stringify(record);
      if (!greps.every((re) => re.test(raw))) {
        continue;
      }
    }

    matched += 1;

    if (aggregating) {
      const key = getGroupKey(record, input.groupBy!);
      let bucket = buckets.get(key);
      if (bucket === undefined) {
        bucket = { key, count: 0 };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      if (aggregate === 'sample') {
        if (bucket.samples === undefined) {
          bucket.samples = [];
        }
        if (bucket.samples.length < sampleSize) {
          bucket.samples.push(record);
        }
      } else if (aggregate === 'firstLast') {
        const ts = parseRecordTime(record);
        if (ts !== undefined) {
          if (bucket.firstMs === undefined || ts < bucket.firstMs) {
            bucket.firstMs = ts;
          }
          if (bucket.lastMs === undefined || ts > bucket.lastMs) {
            bucket.lastMs = ts;
          }
        }
      }
    } else {
      if (collected.length < limit) {
        collected.push(record);
      } else {
        truncated = true;
      }
    }
  }

  const elapsedMs = Date.now() - start;

  if (aggregating) {
    const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
    if (sorted.length > topK) {
      truncated = true;
    }
    const top = sorted.slice(0, topK);
    const groups: GroupOutput[] = top.map((bucket) => {
      const out: GroupOutput = { key: bucket.key, count: bucket.count };
      if (aggregate === 'sample' && bucket.samples) {
        out.samples = bucket.samples.map((record) => projectRecord(record, input.select));
      } else if (aggregate === 'firstLast') {
        if (bucket.firstMs !== undefined) {
          out.first = new Date(bucket.firstMs).toISOString();
        }
        if (bucket.lastMs !== undefined) {
          out.last = new Date(bucket.lastMs).toISOString();
        }
      }
      return out;
    });
    return { total, matched, elapsedMs, truncated, groups };
  }

  // Non-aggregating: rows are returned in the iteration order they arrived in.
  // The caller controls direction via the IDB cursor (asc/desc).
  const entries = collected.map((record) => renderEntry(record, input));
  return { total, matched, elapsedMs, truncated, entries };
};
