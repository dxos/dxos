//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Process from './Process.ts';

describe('Process', () => {
  test('isExited holds only for the states a runtime never leaves', ({ expect }) => {
    const exited = Object.values(Process.State).filter(Process.isExited);
    expect(exited.sort()).toEqual([Process.State.FAILED, Process.State.SUCCEEDED, Process.State.TERMINATED]);
  });

  test('isTerminal adds TERMINATING to the exited states', ({ expect }) => {
    const terminal = Object.values(Process.State).filter(Process.isTerminal);
    expect(terminal.sort()).toEqual([
      Process.State.FAILED,
      Process.State.SUCCEEDED,
      Process.State.TERMINATED,
      Process.State.TERMINATING,
    ]);
  });
});
