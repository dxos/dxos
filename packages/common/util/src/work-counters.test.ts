//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, test } from 'vitest';

import { WORK_COUNTERS_GLOBAL, countWork, getWorkCounters, resetWorkCounters } from './work-counters.ts';

describe('work counters', () => {
  beforeEach(() => {
    resetWorkCounters();
  });

  test('accumulates named totals', ({ expect }) => {
    countWork('automerge.incrementalSaves');
    countWork('automerge.incrementalSaves');
    countWork('automerge.saveBytes', 512);
    expect(getWorkCounters()).toEqual({ 'automerge.incrementalSaves': 2, 'automerge.saveBytes': 512 });
  });

  test('publishes a reader on the global for an out-of-realm harness', ({ expect }) => {
    countWork('echo.queryRuns');
    const read: unknown = Reflect.get(globalThis, WORK_COUNTERS_GLOBAL);
    expect(typeof read === 'function' ? read() : undefined).toEqual({ 'echo.queryRuns': 1 });
  });
});
