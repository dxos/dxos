//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type MetricSpec } from '@dxos/plugin-space/dashboard';

import { toFrames } from './frames';

describe('toFrames', () => {
  test('maps a determinate task to a goal frame', ({ expect }) => {
    const metric: MetricSpec = { kind: 'progress', title: 'Indexing', ratio: 0.456, detail: '45/100' };
    expect(toFrames([metric])).toEqual([{ goalData: { start: 0, current: 46, end: 100, unit: '%' } }]);
  });

  test('maps an indeterminate task to a text frame', ({ expect }) => {
    const metric: MetricSpec = { kind: 'progress', title: 'Syncing', detail: '12' };
    expect(toFrames([metric])).toEqual([{ text: 'Syncing 12' }]);
  });

  test('maps a statistic to a text frame', ({ expect }) => {
    const metric: MetricSpec = { kind: 'stat', title: 'Objects', value: '42' };
    expect(toFrames([metric])).toEqual([{ text: '42 objects' }]);
  });

  test('drops empty slots and caps the cycle', ({ expect }) => {
    const stat = (value: string): MetricSpec => ({ kind: 'stat', title: 'Objects', value });
    expect(toFrames([null, stat('1'), stat('2'), stat('3'), stat('4'), stat('5')])).toHaveLength(4);
  });

  test('returns no frames when there is nothing to show', ({ expect }) => {
    expect(toFrames([null, null])).toEqual([]);
  });
});
