//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type MetricComparison } from '../compare/verdict.ts';
import { defaultInjection } from './scenario.ts';

const target = (id: string, threshold: number, interval: [number, number]): MetricComparison => ({
  id,
  group: id.split(' > ')[0],
  base: 0,
  candidate: 0,
  shift: 0,
  interval,
  delta: 0,
  threshold,
  pairs: 4,
  verdict: 'inconclusive',
});

describe('scenario check', () => {
  test('injects into the steadiest wall-time stage, past its threshold and noise', ({ expect }) => {
    expect(
      defaultInjection([
        target('wall > boot', 600, [-10, 10]),
        target('wall > reload', 630, [-1000, 1000]),
        target('wall > after-reload', 1000, [-20, 30]),
        target('reactRenders > reload', 1, [0, 0]),
      ]),
    ).toEqual({ stage: 'after-reload', ms: 1550 });
  });

  test('has nothing to size from without a bounded wall-time target', ({ expect }) => {
    expect(defaultInjection([target('wall > reload', 630, [-Infinity, Infinity])])).toBeUndefined();
  });
});
