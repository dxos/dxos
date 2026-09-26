//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Task } from '@dxos/types';

import { latestEntries } from './TaskHistory.tsx';

const at = (minute: number): string => new Date(Date.UTC(2026, 0, 1, 0, minute)).toISOString();

const entry = (minute: number): Task.HistoryEntry => ({ date: at(minute), event: 'updated' });

const dates = (entries: readonly Task.HistoryEntry[]): string[] => entries.map(({ date }) => date);

describe('latestEntries', () => {
  test('lists entries oldest first even when the array holds them out of order', ({ expect }) => {
    const entries = [entry(2), entry(1), entry(3)];
    expect(dates(latestEntries(entries, 5))).toEqual([at(1), at(2), at(3)]);
  });

  test('keeps only the most recent entries', ({ expect }) => {
    const entries = [entry(1), entry(2), entry(3)];
    expect(dates(latestEntries(entries, 2))).toEqual([at(2), at(3)]);
    expect(latestEntries(entries, 0)).toEqual([]);
  });
});
