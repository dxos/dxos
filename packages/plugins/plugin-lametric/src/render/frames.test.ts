//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type MetricSpec } from '@dxos/plugin-space/dashboard';

import { toFrames } from './frames.ts';
import { overflows } from './pixels.ts';

describe('toFrames', () => {
  test('maps a determinate task to a goal frame', ({ expect }) => {
    const metric: MetricSpec = { kind: 'progress', title: 'Indexing', ratio: 0.456, detail: '45/100' };
    expect(toFrames([metric])).toEqual([{ goalData: { start: 0, current: 46, end: 100, unit: '%' }, index: 0 }]);
  });

  test('maps an indeterminate task to a text frame', ({ expect }) => {
    const metric: MetricSpec = { kind: 'progress', title: 'Syncing', detail: '12' };
    expect(toFrames([metric])).toEqual([{ text: 'Syncing 12', index: 0 }]);
  });

  test('maps a statistic to a text frame, short enough not to scroll', ({ expect }) => {
    const metric: MetricSpec = { kind: 'stat', title: 'Objects', value: '42' };
    expect(toFrames([metric])).toEqual([{ text: '42 obj', index: 0 }]);
    expect(overflows(toFrames([metric])[0])).toBe(false);
  });

  test('falls back to the lowercased title for an unknown statistic', ({ expect }) => {
    const metric: MetricSpec = { kind: 'stat', title: 'Widgets', value: '7' };
    expect(toFrames([metric])).toEqual([{ text: '7 widgets', index: 0 }]);
  });

  test('drops empty slots and caps the cycle', ({ expect }) => {
    const stat = (value: string): MetricSpec => ({ kind: 'stat', title: 'Objects', value });
    expect(toFrames([null, stat('1'), stat('2'), stat('3'), stat('4'), stat('5')])).toHaveLength(4);
  });

  test('returns no frames when there is nothing to show', ({ expect }) => {
    expect(toFrames([null, null])).toEqual([]);
  });

  test('numbers the frames from zero, since the device shows only the first without an index', ({ expect }) => {
    const stat = (value: string): MetricSpec => ({ kind: 'stat', title: 'Objects', value });
    expect(toFrames([stat('1'), stat('2'), stat('3')]).map((frame) => frame.index)).toEqual([0, 1, 2]);
  });
});
