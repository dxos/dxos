//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Take from './Take.ts';

describe('Take names', () => {
  test('a name round-trips to its start time', ({ expect }) => {
    const date = new Date(Date.UTC(2026, 9, 26, 5, 42, 55));
    const name = Take.makeName(date);
    expect(name).toBe('take-20261026-054255');
    expect(Take.parseName(name)?.toISOString()).toBe(date.toISOString());
  });

  test('the label is the date and time, in the given locale and zone', ({ expect }) => {
    expect(Take.formatName('take-20261026-054255', 'en-US', 'UTC')).toBe('Oct 26, 2026, 5:42:55 AM');
  });

  test('any other name is its own label', ({ expect }) => {
    expect(Take.parseName('narration')).toBeUndefined();
    expect(Take.formatName('narration')).toBe('narration');
  });
});
