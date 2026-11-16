//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeRestartable } from './restartable.ts';

describe('makeRestartable', () => {
  test('a restart from inside a run leaves only the inner run live', ({ expect }) => {
    const live = new Set<number>();
    let runs = 0;
    const restartable = makeRestartable(() => {
      const run = ++runs;
      live.add(run);
      if (run === 1) {
        restartable.restart();
      }
      return () => live.delete(run);
    });

    restartable.restart();
    expect([...live]).toEqual([2]);

    restartable.restart();
    expect([...live]).toEqual([3]);

    restartable.dispose();
    expect([...live]).toEqual([]);
  });
});
