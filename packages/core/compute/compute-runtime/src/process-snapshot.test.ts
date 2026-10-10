//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as Process from '@dxos/compute/Process';

import { makeProcessSnapshot } from './process-snapshot.ts';

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

describe('makeProcessSnapshot', () => {
  test('a snapshot carries only its data, so spreading or serializing it yields the data', ({ expect }) => {
    const process = makeProcessSnapshot(data, () => {
      throw new Error('not resolved');
    });
    expect({ ...process }).toEqual(data);
    expect(JSON.parse(JSON.stringify(process))).toEqual(JSON.parse(JSON.stringify(data)));
  });

  test('a snapshot reaches its runtime only when a live member is used, and only once', ({ expect }) => {
    const live = makeProcessSnapshot(data);
    let resolved = 0;
    const process = makeProcessSnapshot(data, () => {
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
