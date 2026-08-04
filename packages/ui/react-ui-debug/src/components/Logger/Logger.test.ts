//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { LogEntry, LogLevel, log, parseFilter, shouldLog } from '@dxos/log';

import { type LevelName, composeFilter, startLogRecording } from './recorder';

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
