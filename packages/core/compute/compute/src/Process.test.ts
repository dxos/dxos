//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { URI } from '@dxos/keys';

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

describe('Process.currentEnvironment', () => {
  test('is empty outside a process', ({ expect }) => {
    expect(Effect.runSync(Process.currentEnvironment)).toEqual({});
  });

  test('reads the environment the runtime provides', ({ expect }) => {
    const environment: Process.Environment = { conversation: URI.make('echo:///01JTESTCONVERSATION00000000') };
    expect(
      Effect.runSync(Process.currentEnvironment.pipe(Effect.provideService(Process.EnvironmentService, environment))),
    ).toEqual(environment);
  });
});
