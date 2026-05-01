//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LogRecord, formatPrettyLine, runQuery } from './log-query';

const makeRecord = (overrides: Partial<LogRecord> = {}): LogRecord => ({
  t: '2026-01-01T00:00:00.000Z',
  l: 'I',
  m: 'hello',
  f: 'packages/example/src/index.ts',
  n: 1,
  ...overrides,
});

const baseRows: LogRecord[] = [
  makeRecord({ t: '2026-01-01T00:00:01.000Z', l: 'I', m: 'one', f: 'packages/a/src/x.ts' }),
  makeRecord({ t: '2026-01-01T00:00:02.000Z', l: 'W', m: 'two', f: 'packages/a/src/x.ts' }),
  makeRecord({ t: '2026-01-01T00:00:03.000Z', l: 'E', m: 'three', f: 'packages/b/src/y.ts' }),
  makeRecord({ t: '2026-01-01T00:00:04.000Z', l: 'D', m: 'rpc thing', f: 'packages/rpc/src/z.ts' }),
];

describe('runQuery', () => {
  test('returns all entries when no filters set', ({ expect }) => {
    const result = runQuery(baseRows, {});
    expect(result.total).toBe(4);
    expect(result.matched).toBe(4);
    expect(result.entries).toHaveLength(4);
    expect(result.groups).toBeUndefined();
  });

  test('levels allow-list filters by short letter', ({ expect }) => {
    const result = runQuery(baseRows, { levels: ['W', 'E'] });
    expect(result.matched).toBe(2);
    expect(result.entries?.map((entry) => (entry as LogRecord).l)).toEqual(['W', 'E']);
  });

  test('messageRegex filters on message only', ({ expect }) => {
    const result = runQuery(baseRows, { messageRegex: '^t' });
    expect(result.matched).toBe(2);
    expect(result.entries?.map((entry) => (entry as LogRecord).m)).toEqual(['two', 'three']);
  });

  test('grep tests against raw JSON line and ANDs', ({ expect }) => {
    const result = runQuery(baseRows, { grep: ['rpc', 'src/z.ts'] });
    expect(result.matched).toBe(1);
    expect((result.entries![0] as LogRecord).m).toBe('rpc thing');
  });

  test('time bounds are inclusive on ISO strings', ({ expect }) => {
    const result = runQuery(baseRows, {
      since: '2026-01-01T00:00:02.000Z',
      until: '2026-01-01T00:00:03.000Z',
    });
    expect(result.matched).toBe(2);
  });

  test('time bounds accept epoch milliseconds', ({ expect }) => {
    const since = Date.parse('2026-01-01T00:00:03.000Z');
    const result = runQuery(baseRows, { since });
    expect(result.matched).toBe(2);
  });

  test('filter exclude (!rpc) drops matching entries at trace+', ({ expect }) => {
    const result = runQuery(baseRows, { filters: ['debug,!rpc'] });
    // info, warn, error pass; the rpc debug entry is excluded.
    expect(result.matched).toBe(3);
    expect(result.entries?.map((entry) => (entry as LogRecord).m)).not.toContain('rpc thing');
  });

  test('select projects fields onto entries', ({ expect }) => {
    const result = runQuery(baseRows.slice(0, 1), { select: ['t', 'm'] });
    expect(result.entries![0]).toEqual({ t: baseRows[0].t, m: 'one' });
  });

  test('limit caps entries and sets truncated', ({ expect }) => {
    const result = runQuery(baseRows, { limit: 2 });
    expect(result.entries).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  test('groupBy level produces sorted groups by count', ({ expect }) => {
    const rows = [...baseRows, makeRecord({ l: 'I', m: 'four' }), makeRecord({ l: 'W', m: 'five' })];
    const result = runQuery(rows, { groupBy: 'level' });
    expect(result.entries).toBeUndefined();
    expect(result.groups?.[0].key).toBe('I');
    expect(result.groups?.[0].count).toBe(2);
  });

  test('groupBy file works', ({ expect }) => {
    const result = runQuery(baseRows, { groupBy: 'file' });
    expect(result.groups?.find((group) => group.key === 'packages/a/src/x.ts')?.count).toBe(2);
  });

  test('groupBy context.<key> reads parsed c JSON', ({ expect }) => {
    const rows: LogRecord[] = [
      makeRecord({ c: JSON.stringify({ debugLabel: 'queryA' }) }),
      makeRecord({ c: JSON.stringify({ debugLabel: 'queryB' }) }),
      makeRecord({ c: JSON.stringify({ debugLabel: 'queryA' }) }),
      makeRecord({}), // (none) bucket.
    ];
    const result = runQuery(rows, { groupBy: 'context.debugLabel' });
    const byKey = Object.fromEntries(result.groups!.map((group) => [group.key, group.count]));
    expect(byKey.queryA).toBe(2);
    expect(byKey.queryB).toBe(1);
    expect(byKey['(none)']).toBe(1);
  });

  test('aggregate=sample collects up to sampleSize entries per bucket', ({ expect }) => {
    const rows = Array.from({ length: 10 }, (_, idx) => makeRecord({ l: 'I', m: `m${idx}` }));
    const result = runQuery(rows, { groupBy: 'level', aggregate: 'sample', sampleSize: 2 });
    expect(result.groups?.[0].samples).toHaveLength(2);
  });

  test('aggregate=firstLast emits ISO timestamps', ({ expect }) => {
    const result = runQuery(baseRows, { groupBy: 'file', aggregate: 'firstLast' });
    const bucket = result.groups?.find((group) => group.key === 'packages/a/src/x.ts');
    expect(bucket?.first).toBe('2026-01-01T00:00:01.000Z');
    expect(bucket?.last).toBe('2026-01-01T00:00:02.000Z');
  });

  test('topK caps groups and sets truncated', ({ expect }) => {
    const rows: LogRecord[] = ['a', 'b', 'c', 'd'].map((file) => makeRecord({ f: `packages/${file}/x.ts` }));
    const result = runQuery(rows, { groupBy: 'file', topK: 2 });
    expect(result.groups).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  test('format=pretty matches query-logs.mjs formatter', ({ expect }) => {
    const record = makeRecord({
      t: '2026-01-01T00:00:01.000Z',
      l: 'I',
      m: 'hi',
      f: 'a.ts',
      n: 7,
      o: 'Foo',
      c: '{"k":1}',
    });
    const result = runQuery([record], { format: 'pretty' });
    expect(result.entries![0]).toBe(formatPrettyLine(record));
    expect(result.entries![0]).toBe('2026-01-01T00:00:01.000Z I a.ts:7 Foo hi {"k":1} ');
  });

  test('tabId filter restricts to matching environment id', ({ expect }) => {
    const rows: LogRecord[] = [makeRecord({ i: 'tab-a' }), makeRecord({ i: 'tab-b' }), makeRecord({ i: 'tab-a' })];
    const result = runQuery(rows, { tabId: 'tab-a' });
    expect(result.matched).toBe(2);
  });
});
