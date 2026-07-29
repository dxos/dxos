//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatTime } from './RewindWidget';

const NOW = new Date('2026-07-29T12:00:00Z').getTime();

describe('formatTime', () => {
  test('renders an empty string for an unparseable timestamp', ({ expect }) => {
    expect(formatTime('not a date', NOW)).toBe('');
  });

  test('renders sub-minute ages in seconds', ({ expect }) => {
    expect(formatTime(ago(20 * SECOND), NOW)).toMatch(/20 (seconds?|sec)/i);
    // Never "0 seconds ago".
    expect(formatTime(ago(200), NOW)).toMatch(/1 (second|sec)/i);
  });

  test('renders minutes and hours relatively', ({ expect }) => {
    expect(formatTime(ago(5 * MINUTE), NOW)).toMatch(/5 min/i);
    expect(formatTime(ago(3 * HOUR), NOW)).toMatch(/3 (hours?|hr)/i);
  });

  test('renders the previous day as yesterday', ({ expect }) => {
    expect(formatTime(ago(26 * HOUR), NOW)).toMatch(/yesterday/i);
  });

  // Two days is the cut-over: beyond it a date reads better than a growing "N days ago".
  test('renders anything two days or older as a date', ({ expect }) => {
    const older = formatTime(ago(2 * DAY), NOW);
    expect(older).not.toMatch(/ago|yesterday/i);
    expect(older).toMatch(/\d/);
    expect(formatTime(ago(400 * DAY), NOW)).not.toMatch(/ago/i);
  });

  test('stays just inside the relative window below two days', ({ expect }) => {
    expect(formatTime(ago(2 * DAY - MINUTE), NOW)).toMatch(/ago|yesterday/i);
  });

  // Clock skew across peers can date a message slightly in the future; a "in 3 minutes" prompt would
  // read as a bug, so fall back to the absolute date.
  test('renders a future timestamp as a date', ({ expect }) => {
    expect(formatTime(new Date(NOW + 5 * MINUTE).toISOString(), NOW)).not.toMatch(/ago|in \d/i);
  });
});

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (elapsed: number) => new Date(NOW - elapsed).toISOString();
