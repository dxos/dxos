//
// Copyright 2026 DXOS.org
//

import { addDays, subDays } from 'date-fns';
import { describe, test } from 'vitest';

import { resolveSyncWindow } from './syncWindow';

const NOW = new Date('2026-07-06T00:00:00.000Z');

describe('resolveSyncWindow', () => {
  test('no cursor → backward initial from the default horizon to today', ({ expect }) => {
    const window = resolveSyncWindow({ cursorKey: 0, now: NOW });
    expect(window.direction).toBe('backward');
    expect(window.start).toEqual(subDays(NOW, 30));
    expect(window.end).toEqual(addDays(NOW, 1));
  });

  test('cursor → forward incremental from the cursor', ({ expect }) => {
    const cursorKey = new Date('2026-06-01T00:00:00.000Z').getTime();
    const window = resolveSyncWindow({ cursorKey, now: NOW });
    expect(window.direction).toBe('forward');
    expect(window.start).toEqual(new Date(cursorKey));
    expect(window.end).toEqual(addDays(NOW, 1));
  });

  test('direction: backward + before → backfill older gaps, ignoring the cursor as the start', ({ expect }) => {
    const cursorKey = new Date('2026-06-01T00:00:00.000Z').getTime();
    const before = new Date('2026-05-01T00:00:00.000Z').getTime();
    const window = resolveSyncWindow({ cursorKey, now: NOW, direction: 'backward', before });
    expect(window.direction).toBe('backward');
    // Backward never resumes from the cursor; it walks from the horizon up to `before`.
    expect(window.start).toEqual(subDays(NOW, 30));
    expect(window.end).toEqual(new Date(before));
  });

  test('syncBackDays overrides the horizon', ({ expect }) => {
    const window = resolveSyncWindow({ cursorKey: 0, now: NOW, syncBackDays: 7 });
    expect(window.start).toEqual(subDays(NOW, 7));
  });

  test('after sets the horizon when syncBackDays is absent', ({ expect }) => {
    const after = '2026-01-01T00:00:00.000Z';
    const window = resolveSyncWindow({ cursorKey: 0, now: NOW, after });
    expect(window.start).toEqual(new Date(after));
  });
});
