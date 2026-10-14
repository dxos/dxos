//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type StageEvent } from '../score/stages.ts';
import { comparabilityDifferences } from './compare.ts';

const events = (properties: StageEvent['properties']): StageEvent[] => [
  { properties: { servingMode: 'preview', instruments: 'profiler', settleMs: 20_000, ...properties } },
];

describe('compare', () => {
  test('names each condition two arms were measured under differently', ({ expect }) => {
    expect(comparabilityDifferences(events({}), events({ http2: true, cpuThrottle: 4 }))).toEqual([
      'http2 - vs true',
      'cpuThrottle - vs 4',
    ]);
  });

  test('has nothing to say about an arm that produced no rows', ({ expect }) => {
    expect(comparabilityDifferences([], events({ http2: true }))).toEqual([]);
  });
});
