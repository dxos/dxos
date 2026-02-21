//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { type LogConfig, type LogEntry, LogLevel } from '@dxos/log';

import { LogBuffer } from './log-buffer';

const baseConfig: LogConfig = {
  options: {},
  filters: [{ level: LogLevel.DEBUG }],
  processors: [],
};

const createEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  level: LogLevel.INFO,
  message: 'test message',
  ...overrides,
});

describe('LogBuffer', () => {
  test('pushes and serializes log entries', ({ expect }) => {
    const buffer = new LogBuffer(10);
    buffer.logProcessor(baseConfig, createEntry({ message: 'hello' }));
    buffer.logProcessor(baseConfig, createEntry({ message: 'world' }));

    expect(buffer.size).toBe(2);
    const lines = buffer.serialize().split('\n');
    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0]);
    expect(first.m).toBe('hello');
    expect(first.l).toBe('I');
    expect(first.t).toBeDefined();

    const second = JSON.parse(lines[1]);
    expect(second.m).toBe('world');
  });

  test('evicts oldest entries when buffer is full', ({ expect }) => {
    const buffer = new LogBuffer(3);
    buffer.logProcessor(baseConfig, createEntry({ message: 'a' }));
    buffer.logProcessor(baseConfig, createEntry({ message: 'b' }));
    buffer.logProcessor(baseConfig, createEntry({ message: 'c' }));
    buffer.logProcessor(baseConfig, createEntry({ message: 'd' }));

    expect(buffer.size).toBe(3);
    const lines = buffer.serialize().split('\n');
    const messages = lines.map((l) => JSON.parse(l).m);
    expect(messages).toEqual(['b', 'c', 'd']);
  });

  test('skips TRACE-level logs', ({ expect }) => {
    const buffer = new LogBuffer(10);
    buffer.logProcessor(baseConfig, createEntry({ level: LogLevel.TRACE, message: 'trace' }));
    expect(buffer.size).toBe(0);
  });

  test('captures DEBUG-level and above', ({ expect }) => {
    const buffer = new LogBuffer(10);
    buffer.logProcessor(baseConfig, createEntry({ level: LogLevel.DEBUG, message: 'debug' }));
    buffer.logProcessor(baseConfig, createEntry({ level: LogLevel.WARN, message: 'warn' }));
    buffer.logProcessor(baseConfig, createEntry({ level: LogLevel.ERROR, message: 'error' }));

    expect(buffer.size).toBe(3);
    const lines = buffer.serialize().split('\n');
    expect(JSON.parse(lines[0]).l).toBe('D');
    expect(JSON.parse(lines[1]).l).toBe('W');
    expect(JSON.parse(lines[2]).l).toBe('E');
  });

  test('captures file and line metadata', ({ expect }) => {
    const buffer = new LogBuffer(10);
    buffer.logProcessor(
      baseConfig,
      createEntry({
        meta: { F: '/home/user/project/packages/sdk/test.ts', L: 42, S: undefined },
      }),
    );

    const lines = buffer.serialize().split('\n');
    const record = JSON.parse(lines[0]);
    expect(record.f).toBe('packages/sdk/test.ts');
    expect(record.n).toBe(42);
  });

  test('captures error stack', ({ expect }) => {
    const buffer = new LogBuffer(10);
    const error = new Error('boom');
    buffer.logProcessor(baseConfig, createEntry({ error }));

    const lines = buffer.serialize().split('\n');
    const record = JSON.parse(lines[0]);
    expect(record.e).toContain('boom');
  });

  test('truncates context to 500 chars', ({ expect }) => {
    const buffer = new LogBuffer(10);
    const longValue = 'x'.repeat(1000);
    buffer.logProcessor(baseConfig, createEntry({ context: { data: longValue } }));

    const lines = buffer.serialize().split('\n');
    const record = JSON.parse(lines[0]);
    expect(record.c).toBeDefined();
    expect(record.c!.length).toBe(500);
  });

  test('skips Error context objects', ({ expect }) => {
    const buffer = new LogBuffer(10);
    buffer.logProcessor(baseConfig, createEntry({ context: new Error('ctx error') }));

    const lines = buffer.serialize().split('\n');
    const record = JSON.parse(lines[0]);
    expect(record.c).toBeUndefined();
  });

  test('handles non-serializable context gracefully', ({ expect }) => {
    const buffer = new LogBuffer(10);
    const circular: Record<string, any> = {};
    circular.self = circular;
    buffer.logProcessor(baseConfig, createEntry({ context: circular }));

    const lines = buffer.serialize().split('\n');
    const record = JSON.parse(lines[0]);
    expect(record.c).toBeUndefined();
  });

  test('serialize returns empty string for empty buffer', ({ expect }) => {
    const buffer = new LogBuffer(10);
    expect(buffer.serialize()).toBe('');
  });
});
