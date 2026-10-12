//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { LogEntry, LogLevel, log, parseFilter, shouldLog } from '@dxos/log';

import { LogBuffer } from './log-buffer.ts';
import { type LevelName, composeFilter, startLogRecording } from './recorder.ts';

describe('composeFilter', () => {
  test('base only when no overrides', ({ expect }) => {
    expect(composeFilter('info', new Map())).toBe('info');
  });

  test('appends per-file overrides in insertion order', ({ expect }) => {
    const map = new Map<string, LevelName>([
      ['a.ts', 'debug'],
      ['b.ts', 'error'],
    ]);
    expect(composeFilter('info', map)).toBe('info, a.ts:debug, b.ts:error');
  });

  test('override below base raises verbosity for that file only', ({ expect }) => {
    const filters = parseFilter(composeFilter('info', new Map([['a.ts', 'debug']])));
    expect(shouldLog(entry(LogLevel.DEBUG, 'a.ts'), filters)).toBe(true);
    expect(shouldLog(entry(LogLevel.DEBUG, 'b.ts'), filters)).toBe(false);
  });

  test('override above base quiets that file only', ({ expect }) => {
    const filters = parseFilter(composeFilter('info', new Map([['a.ts', 'error']])));
    expect(shouldLog(entry(LogLevel.INFO, 'a.ts'), filters)).toBe(false);
    expect(shouldLog(entry(LogLevel.ERROR, 'a.ts'), filters)).toBe(true);
    expect(shouldLog(entry(LogLevel.INFO, 'b.ts'), filters)).toBe(true);
  });
});

const entry = (level: LogLevel, file: string) =>
  new LogEntry({ level, message: '', meta: { F: file, L: 0, S: undefined }, timestamp: 0 });

describe('startLogRecording', () => {
  test('concurrent recorders each see only their own filtered entries', ({ expect }) => {
    const debugLevels: LogLevel[] = [];
    const errorLevels: LogLevel[] = [];
    const debugRecorder = startLogRecording('debug', (rec, matched) => matched && debugLevels.push(rec.level));
    const errorRecorder = startLogRecording('error', (rec, matched) => matched && errorLevels.push(rec.level));

    log.debug('debug entry');
    log.error('error entry');

    debugRecorder.dispose();
    errorRecorder.dispose();

    // The stricter recorder is not clobbered by the more verbose one registered alongside it.
    expect(debugLevels).toEqual([LogLevel.DEBUG, LogLevel.ERROR]);
    expect(errorLevels).toEqual([LogLevel.ERROR]);
  });

  test('composes the shared global filter and restores it on release', ({ expect }) => {
    const original = log.runtimeConfig.options.filter;
    const first = startLogRecording('info', () => {});
    const second = startLogRecording('error', () => {});

    expect(log.runtimeConfig.options.filter).toBe('info, error');
    second.dispose();
    expect(log.runtimeConfig.options.filter).toBe('info');
    first.dispose();
    expect(log.runtimeConfig.options.filter).toBe(original);
  });
});

describe('LogBuffer', () => {
  test('caller-provided buffer is fed by append, not by @dxos/log', ({ expect }) => {
    const buffer = new LogBuffer();
    let notified = 0;
    const unsubscribe = buffer.subscribe(() => notified++);
    buffer.start();
    expect(buffer.recording).toBe(true);

    log.info('not captured');
    buffer.append(entry(LogLevel.INFO, 'a.ts'));
    buffer.append(entry(LogLevel.DEBUG, 'a.ts'));
    buffer.append(entry(LogLevel.WARN, 'b.ts'));
    unsubscribe();

    // The debug entry falls below the default `info` filter; the `log.info` call never reaches the buffer.
    expect(buffer.getRows().map(({ entry }) => entry.level)).toEqual([LogLevel.INFO, LogLevel.WARN]);
    expect(buffer.getFiles()).toEqual(['a.ts', 'b.ts']);
    expect(notified).toBeGreaterThan(0);
  });

  test('append respects capacity and pause', ({ expect }) => {
    const buffer = new LogBuffer();
    buffer.setCapacity(2);
    buffer.append(entry(LogLevel.INFO, 'a.ts'));
    buffer.append(entry(LogLevel.INFO, 'b.ts'));
    buffer.append(entry(LogLevel.INFO, 'c.ts'));
    expect(buffer.getRows().map(({ entry }) => entry.meta?.F)).toEqual(['b.ts', 'c.ts']);

    buffer.setPaused(true);
    buffer.append(entry(LogLevel.INFO, 'd.ts'));
    expect(buffer.getRows()).toHaveLength(2);
  });
});
