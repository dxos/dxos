//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Progress } from '@dxos/progress';

import { toDialSpecs } from './monitors';
import { type SpaceStats } from './types';

const stats: SpaceStats = { objects: 128, feeds: 3, types: 9, plugins: 21 };

const task = (overrides: Partial<Progress.TaskProgress> = {}): Progress.TaskProgress => ({
  name: 'sync',
  current: 5,
  total: 10,
  status: 'running',
  updatedAt: '2026-08-19T00:00:00.000Z',
  ...overrides,
});

describe('toDialSpecs', () => {
  test('shows space stats when nothing is running', ({ expect }) => {
    expect(toDialSpecs([], stats, 4)).toEqual([
      { kind: 'stat', title: 'Objects', value: '128' },
      { kind: 'stat', title: 'Feeds', value: '3' },
      { kind: 'stat', title: 'Types', value: '9' },
      { kind: 'stat', title: 'Plugins', value: '21' },
    ]);
  });

  test('an active task takes over the strip', ({ expect }) => {
    const [first, ...rest] = toDialSpecs([task({ label: 'Syncing' })], stats, 4);
    expect(first).toEqual({ kind: 'progress', title: 'Syncing', ratio: 0.5, detail: '5/10' });
    expect(rest).toEqual([null, null, null]);
  });

  test('falls back to the task name when it has no label', ({ expect }) => {
    expect(toDialSpecs([task()], stats, 1)[0]).toMatchObject({ title: 'sync' });
  });

  test('ignores finished and failed tasks', ({ expect }) => {
    const specs = toDialSpecs([task({ status: 'done' }), task({ name: 'other', status: 'error' })], stats, 4);
    expect(specs.every((spec) => spec?.kind === 'stat')).toBe(true);
  });

  test('a task with no total is indeterminate', ({ expect }) => {
    expect(toDialSpecs([task({ total: undefined, current: 7 })], stats, 1)[0]).toEqual({
      kind: 'progress',
      title: 'sync',
      ratio: undefined,
      detail: '7',
    });
  });

  test('clamps a ratio a producer reports out of range', ({ expect }) => {
    expect(toDialSpecs([task({ current: -5 })], stats, 1)[0]).toMatchObject({ ratio: 0 });
    expect(toDialSpecs([task({ current: 50 })], stats, 1)[0]).toMatchObject({ ratio: 1 });
  });

  test('treats a non-finite ratio as indeterminate', ({ expect }) => {
    // A non-finite bar serializes to `null`, which the device would reject along with the frame.
    expect(toDialSpecs([task({ current: Number.NaN })], stats, 1)[0]).toMatchObject({ ratio: undefined });
    expect(toDialSpecs([task({ current: Number.POSITIVE_INFINITY })], stats, 1)[0]).toMatchObject({
      ratio: undefined,
    });
  });

  test('truncates to the available dials', ({ expect }) => {
    const tasks = Array.from({ length: 6 }, (_, index) => task({ name: `task-${index}` }));
    expect(toDialSpecs(tasks, stats, 4)).toHaveLength(4);
  });
});
