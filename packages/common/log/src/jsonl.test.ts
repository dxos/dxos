//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { LogEntry, type LogEntryInit, LogLevel } from './index';
import { serializeToJsonl } from './jsonl';

const createEntry = (overrides: Partial<LogEntryInit> = {}): LogEntry =>
  new LogEntry({
    level: LogLevel.INFO,
    message: 'test message',
    ...overrides,
  });

const parseLine = (line: string | undefined) => {
  if (line === undefined) {
    throw new Error('expected line, got undefined');
  }
  return JSON.parse(line) as Record<string, unknown>;
};

describe('serializeToJsonl', () => {
  test('returns undefined for TRACE level entries', ({ expect }) => {
    expect(serializeToJsonl(createEntry({ level: LogLevel.TRACE }))).toBeUndefined();
  });

  test('emits compact record with t/l/m fields', ({ expect }) => {
    const record = parseLine(serializeToJsonl(createEntry({ message: 'hello' })));
    expect(record.t).toBeTypeOf('string');
    expect(record.l).toBe('I');
    expect(record.m).toBe('hello');
  });

  test('uses level letters D V I W E', ({ expect }) => {
    const levels: Array<[LogLevel, string]> = [
      [LogLevel.DEBUG, 'D'],
      [LogLevel.VERBOSE, 'V'],
      [LogLevel.INFO, 'I'],
      [LogLevel.WARN, 'W'],
      [LogLevel.ERROR, 'E'],
    ];
    for (const [level, letter] of levels) {
      const record = parseLine(serializeToJsonl(createEntry({ level, message: '' })));
      expect(record.l).toBe(letter);
    }
  });

  test('omits optional fields when not present', ({ expect }) => {
    const record = parseLine(serializeToJsonl(createEntry({ message: 'plain' })));
    expect(record.f).toBeUndefined();
    expect(record.n).toBeUndefined();
    expect(record.o).toBeUndefined();
    expect(record.e).toBeUndefined();
    expect(record.c).toBeUndefined();
    expect(record.i).toBeUndefined();
  });

  test('captures filename and line metadata', ({ expect }) => {
    const record = parseLine(
      serializeToJsonl(
        createEntry({
          meta: { F: '/home/user/project/packages/sdk/test.ts', L: 42, S: undefined },
        }),
      ),
    );
    expect(record.f).toBe('packages/sdk/test.ts');
    expect(record.n).toBe(42);
  });

  test('captures error stack via computedError', ({ expect }) => {
    const error = new Error('boom');
    const record = parseLine(serializeToJsonl(createEntry({ error })));
    expect(record.e).toContain('boom');
  });

  test('captures context as flat JSON string', ({ expect }) => {
    const record = parseLine(serializeToJsonl(createEntry({ context: { count: 3, name: 'x' } })));
    expect(record.c).toBeTypeOf('string');
    const ctx = JSON.parse(record.c as string);
    expect(ctx.count).toBe(3);
    expect(ctx.name).toBe('x');
  });

  test('flattens nested objects in context (one level)', ({ expect }) => {
    const record = parseLine(
      serializeToJsonl(createEntry({ context: { nested: { a: 1, b: 2 } } })),
    );
    const ctx = JSON.parse(record.c as string);
    // computedContext converts nested objects to JSON strings via stringifyOneLevel.
    expect(typeof ctx.nested).toBe('string');
    expect(ctx.nested).toBe('{"a":1,"b":2}');
  });

  test('does not truncate long context (idb-store style)', ({ expect }) => {
    const longValue = 'x'.repeat(2_000);
    const record = parseLine(serializeToJsonl(createEntry({ context: { data: longValue } })));
    const ctx = JSON.parse(record.c as string);
    expect(ctx.data).toBe(longValue);
  });

  test('embeds env identifier in `i` field', ({ expect }) => {
    const record = parseLine(
      serializeToJsonl(createEntry({ message: 'm' }), { env: 'tab:http://localhost:5173:abc123' }),
    );
    expect(record.i).toBe('tab:http://localhost:5173:abc123');
  });

  test('omits `i` when env is not provided', ({ expect }) => {
    const record = parseLine(serializeToJsonl(createEntry({ message: 'm' })));
    expect(record.i).toBeUndefined();
  });

  test('output is valid single-line JSON (no embedded newlines)', ({ expect }) => {
    const line = serializeToJsonl(createEntry({ message: 'multi\nline\nmessage' }));
    expect(line).toBeDefined();
    expect(line!.indexOf('\n')).toBe(-1);
    // The newlines inside the message are escaped by JSON.stringify.
    const record = JSON.parse(line!);
    expect(record.m).toBe('multi\nline\nmessage');
  });
});
