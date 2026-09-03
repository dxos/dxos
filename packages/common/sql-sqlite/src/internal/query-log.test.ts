//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LogEntry, LogLevel, type LogProcessor, log, serializeToJsonl } from '@dxos/log';

import { SLOW_QUERY_THRESHOLD_MS, logSqliteQuery } from './query-log';

/** Captures entries the way the feedback log store does — through the JSONL serializer, which drops TRACE. */
const capture = (fn: () => void): { entries: LogEntry[]; jsonl: string[] } => {
  const entries: LogEntry[] = [];
  const processor: LogProcessor = (_config, entry) => {
    entries.push(entry);
  };
  const remove = log.addProcessor(processor);
  try {
    fn();
  } finally {
    remove();
  }

  return { entries, jsonl: entries.map((entry) => serializeToJsonl(entry)).filter((line) => line !== undefined) };
};

describe('logSqliteQuery', () => {
  test('a fast query is TRACE, so it never reaches an uploaded log bundle', ({ expect }) => {
    const { entries, jsonl } = capture(() =>
      logSqliteQuery({ sql: 'SELECT 1', params: [], results: 1, time: SLOW_QUERY_THRESHOLD_MS - 1 }),
    );
    expect(entries.map((entry) => entry.level)).toEqual([LogLevel.TRACE]);
    expect(jsonl).toEqual([]);
  });

  test('a slow query is DEBUG, so it survives for triage', ({ expect }) => {
    const { entries, jsonl } = capture(() =>
      logSqliteQuery({ sql: 'SELECT 1', params: [], results: 1, time: SLOW_QUERY_THRESHOLD_MS }),
    );
    expect(entries.map((entry) => entry.level)).toEqual([LogLevel.DEBUG]);
    expect(jsonl).toHaveLength(1);
    expect(jsonl[0]).toContain('sqlite query');
  });

  test('oversized params are summarized rather than embedded', ({ expect }) => {
    const { entries } = capture(() =>
      logSqliteQuery({
        sql: 'SELECT ?',
        params: [new Uint8Array(1024), 'x'.repeat(256)],
        results: 0,
        time: SLOW_QUERY_THRESHOLD_MS,
      }),
    );
    const context = entries[0].computedContext;
    expect(String(context.params)).toContain('<Uint8Array 1024 bytes>');
    expect(String(context.params)).toContain('(256 chars)');
  });
});
