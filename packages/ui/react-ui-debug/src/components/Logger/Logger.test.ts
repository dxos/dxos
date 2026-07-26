//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LogLevel, parseFilter, shouldLog } from '@dxos/log';

import { composeFilter, type LevelName } from './Logger';

const entry = (level: LogLevel, file: string) => ({ level, meta: { F: file } }) as any;

describe('composeFilter', () => {
  test('base only when no overrides', () => {
    expect(composeFilter('info', new Map())).toBe('info');
  });

  test('appends per-file overrides in insertion order', () => {
    const map = new Map<string, LevelName>([
      ['a.ts', 'debug'],
      ['b.ts', 'error'],
    ]);
    expect(composeFilter('info', map)).toBe('info, a.ts:debug, b.ts:error');
  });

  test('override below base raises verbosity for that file only', () => {
    const filters = parseFilter(composeFilter('info', new Map([['a.ts', 'debug']])));
    expect(shouldLog(entry(LogLevel.DEBUG, 'a.ts'), filters)).toBe(true);
    expect(shouldLog(entry(LogLevel.DEBUG, 'b.ts'), filters)).toBe(false);
  });

  test('override above base quiets that file only', () => {
    const filters = parseFilter(composeFilter('info', new Map([['a.ts', 'error']])));
    expect(shouldLog(entry(LogLevel.INFO, 'a.ts'), filters)).toBe(false);
    expect(shouldLog(entry(LogLevel.ERROR, 'a.ts'), filters)).toBe(true);
    expect(shouldLog(entry(LogLevel.INFO, 'b.ts'), filters)).toBe(true);
  });
});
