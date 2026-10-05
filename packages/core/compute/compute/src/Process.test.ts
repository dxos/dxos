//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as Process from './Process.ts';

const data: Process.Data = {
  pid: Process.ID.make('pid-1'),
  parentPid: null,
  key: 'test.process',
  params: { name: null, annotations: {} },
  environment: {},
  state: Process.State.RUNNING,
  error: null,
  startedAt: 1,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
};

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

  test('make carries only its data, so spreading or serializing it yields the data', ({ expect }) => {
    const process = Process.make(data, () => {
      throw new Error('not resolved');
    });
    expect({ ...process }).toEqual(data);
    expect(JSON.parse(JSON.stringify(process))).toEqual(JSON.parse(JSON.stringify(data)));
  });

  test('a made process reaches its runtime only when a live member is used, and only once', ({ expect }) => {
    const live = Process.make(data);
    let resolved = 0;
    const process = Process.make(data, () => {
      resolved++;
      return live;
    });
    expect(process.state).toEqual(Process.State.RUNNING);
    expect(resolved).toEqual(0);

    // `live` has no runtime of its own, so delegating to it throws — after resolving.
    expect(() => process.status).toThrow(/known only from data/);
    expect(() => Effect.runSync(process.terminate())).toThrow(/known only from data/);
    expect(resolved).toEqual(1);
  });
});
