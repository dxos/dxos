//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_COUNTERS, countersLabel, parseCounters } from './counters.ts';

describe('parseCounters', () => {
  test('unset and default give the default set', ({ expect }) => {
    expect(parseCounters(undefined)).toEqual(DEFAULT_COUNTERS);
    expect(parseCounters('default')).toEqual(DEFAULT_COUNTERS);
  });

  test('a list enables exactly its names', ({ expect }) => {
    expect(parseCounters('calls, react')).toEqual({ trace: false, calls: true, react: true });
    expect(countersLabel(parseCounters('calls,react'))).toBe('calls+react');
    expect(countersLabel(parseCounters('none'))).toBe('none');
    expect(countersLabel(parseCounters('all'))).toBe('trace+calls+react');
  });

  test('an unknown name throws rather than running a different set', ({ expect }) => {
    expect(() => parseCounters('trace,reakt')).toThrow(/reakt/);
  });
});
