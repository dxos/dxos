//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { STAGE_WALL_GROUP, WORK_GROUP } from '../score/stages.ts';
import { renderComparison } from './render.ts';
import { type MetricComparison } from './verdict.ts';

const comparison = (
  id: string,
  group: string,
  base: number,
  candidate: number,
  verdict: MetricComparison['verdict'],
): MetricComparison => ({
  id,
  group,
  base,
  candidate,
  shift: candidate - base,
  interval: [candidate - base, candidate - base],
  delta: Math.sign(candidate - base),
  threshold: 1,
  pairs: 5,
  verdict,
});

describe('compare render', () => {
  test('lists the targets that are not settled as unchanged, and only the other metrics that moved', ({ expect }) => {
    const lines = renderComparison({
      comparisons: [
        comparison('wall > boot', STAGE_WALL_GROUP, 1000, 800, 'improved'),
        comparison('wall > open-tasks', STAGE_WALL_GROUP, 1000, 1010, 'no-change'),
        comparison('reactRenders > boot', WORK_GROUP, 100, 130, 'regressed'),
        comparison('layoutCount > boot', WORK_GROUP, 10, 10, 'no-change'),
      ],
      isTarget: (id) => id.startsWith('wall > '),
    });
    expect(lines[0]).toBe('targets (2): 1 no change');
    expect(lines.filter((line) => line.startsWith('improved'))).toHaveLength(1);
    expect(lines.some((line) => line.startsWith('no-change'))).toBe(false);
    expect(lines.some((line) => line.includes('reactRenders > boot'))).toBe(true);
    expect(lines.some((line) => line.includes('layoutCount > boot'))).toBe(false);
  });

  test('a work counter that halved is called out, whatever the targets', ({ expect }) => {
    const lines = renderComparison({
      comparisons: [
        comparison('wall > open-tasks', STAGE_WALL_GROUP, 1000, 400, 'improved'),
        comparison('reactRenders > open-tasks', WORK_GROUP, 200, 20, 'improved'),
      ],
      isTarget: (id) => id.startsWith('wall > '),
    });
    expect(lines.some((line) => line.startsWith('work fell by more than half (1)'))).toBe(true);
  });
});
