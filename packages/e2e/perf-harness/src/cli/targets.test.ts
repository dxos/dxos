//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TARGETS, describeConditions, withConditions } from './targets.ts';

describe('targets', () => {
  test('conditions reach the build, its cache key and the flow', ({ expect }) => {
    const target = withConditions(TARGETS.composer, { until: 'open-space', serviceWorker: true, cpuThrottle: 4 });
    expect(target.build.env.DX_PWA).toBe('true');
    expect(target.build.variant).toBe('sw');
    expect(target.env).toEqual({
      DX_PERF_UNTIL: 'open-space',
      DX_PERF_SERVICE_WORKER: '1',
      DX_PERF_CPU_THROTTLE: '4',
    });
    expect(describeConditions(target.conditions)).toBe('until open-space, service worker, CPU 4x slower');
  });

  test('the defaults change nothing', ({ expect }) => {
    const target = withConditions(TARGETS.composer);
    expect(target.build).toEqual(TARGETS.composer.build);
    expect(describeConditions(target.conditions)).toBeUndefined();
  });
});
