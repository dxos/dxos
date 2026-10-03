//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatRelative } from './format-date.ts';

const now = new Date('2026-09-24T12:00:00Z');
const daysBefore = (days: number): string => new Date(now.getTime() - days * 24 * 60 * 60_000).toISOString();

describe('formatRelative', () => {
  test('recent dates read as a distance', ({ expect }) => {
    expect(formatRelative(daysBefore(0), { now })).to.contain('ago');
    expect(formatRelative(daysBefore(2), { now })).to.contain('ago');
  });

  test('the boundary day is still a distance', ({ expect }) => {
    expect(formatRelative(daysBefore(3), { now })).to.contain('ago');
  });

  test('beyond the boundary reads as a calendar date', ({ expect }) => {
    const formatted = formatRelative(daysBefore(4), { now });
    expect(formatted).to.not.contain('ago');
    // Locale-dependent, so the assertion is on the year the reader must be able to see.
    expect(formatted).to.contain('2026');
  });

  test('the boundary is configurable', ({ expect }) => {
    expect(formatRelative(daysBefore(2), { now, relativeDays: 1 })).to.not.contain('ago');
  });

  test('an unparseable value is returned as it came', ({ expect }) => {
    expect(formatRelative('not a date', { now })).to.eq('not a date');
  });
});
