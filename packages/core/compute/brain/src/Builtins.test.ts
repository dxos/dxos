//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Builtins from './Builtins.ts';

describe('Builtins', () => {
  test('keyword matching stems and ignores stop words', ({ expect }) => {
    expect(Builtins.keywordMatch('I shipped the v0.9 release', 'release ships')).toBe(true);
    expect(Builtins.keywordMatch('French fries for lunch', 'french practice')).toBe(false);
    expect(Builtins.keywordMatch('anything', 'the of')).toBe(false);
  });

  test('parses durations', ({ expect }) => {
    expect(Builtins.parseDuration('2d')).toBe(2 * 864e5);
    expect(Builtins.parseDuration('PT30m')).toBe(30 * 6e4);
    expect(Builtins.parseDuration('soon')).toBeUndefined();
  });

  test('evaluates time and text built-ins', ({ expect }) => {
    const context = Builtins.emptyContext();
    context.text.add('f1', 'the agent plugin');
    context.entities.add('f1', ['rich']);
    let now = Date.parse('2027-01-06T09:00:00Z');
    const registry = Builtins.make({
      ...context,
      clock: { ...context.clock, now: () => now, createdAt: Date.parse('2027-01-04T09:00:00Z') },
    });
    const call = (name: string, ...args: Array<string | undefined>) => [...(registry.get(name)?.evaluate(args) ?? [])];

    expect(call('about', undefined, 'plugin')).toEqual([['f1', 'plugin']]);
    expect(call('about', 'f1', 'release')).toEqual([]);
    expect(call('concerns', undefined, 'rich')).toEqual([['f1', 'rich']]);
    expect(call('elapsed', 'goal', '2d')).toHaveLength(1);
    now -= 1;
    expect(call('elapsed', 'goal', '2d')).toHaveLength(0);
    expect(call('weekday', '2027-01-08T15:00:00Z', undefined)).toEqual([['2027-01-08T15:00:00Z', 'friday']]);
    expect(call('weekday', '2027-01-08T15:00:00Z', 'Friday')).toEqual([['2027-01-08T15:00:00Z', 'Friday']]);
    expect(call('due', '2027-01-10T00:00:00Z', '7d')).toHaveLength(1);
    expect(registry.get('elapsed')?.volatile).toBe(true);
    expect(registry.get('weekday')?.volatile).toBeFalsy();
  });
});
