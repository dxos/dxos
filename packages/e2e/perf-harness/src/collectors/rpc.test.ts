//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RpcReading, diffRpc } from './rpc.ts';

const reading = (overrides: Partial<RpcReading> = {}): RpcReading => ({
  name: 'worker:dedicated.js',
  kind: 'worker',
  readAt: 1_000,
  calls: 0,
  clientCalls: 0,
  samples: [],
  clientSamples: [],
  ...overrides,
});

describe('diffRpc', () => {
  test('counts the calls a stage served, not the realm total', ({ expect }) => {
    const [realm] = diffRpc([reading({ calls: 500 })], [reading({ calls: 540, readAt: 2_000 })]);
    expect(realm.calls).toBe(40);
  });

  test('takes percentiles only over samples inside the stage window', ({ expect }) => {
    // The ring carries whatever the realm recorded before the stage opened; charging those to this
    // stage would report the previous stage's worst call as this one's.
    const [realm] = diffRpc(
      [reading({ readAt: 1_000, calls: 1 })],
      [
        reading({
          readAt: 2_000,
          calls: 3,
          samples: [
            { queueWaitMs: 900, serviceMs: 900, at: 500 },
            { queueWaitMs: 10, serviceMs: 20, at: 1_200 },
            { queueWaitMs: 30, serviceMs: 40, at: 1_800 },
          ],
        }),
      ],
    );
    expect(realm.queueWaitMaxMs).toBe(30);
    expect(realm.serviceMaxMs).toBe(40);
    expect(realm.samples).toBe(2);
  });

  test('reports a realm that appeared mid-stage whole', ({ expect }) => {
    // `boot` creates the worker that serves every later call, so a realm absent at the opening
    // boundary did all of its work inside this stage.
    const [realm] = diffRpc([], [reading({ calls: 7, samples: [{ queueWaitMs: 60, serviceMs: 5, at: 400 }] })]);
    expect(realm.calls).toBe(7);
    expect(realm.queueWaitMaxMs).toBe(60);
  });

  test('separates round trip from the serving realm', ({ expect }) => {
    const realms = diffRpc(
      [],
      [
        reading({ name: 'page', kind: 'page', clientCalls: 12, clientSamples: [{ roundTripMs: 400, at: 10 }] }),
        reading({ calls: 12, samples: [{ queueWaitMs: 5, serviceMs: 8, at: 10 }] }),
      ],
    );
    expect(realms[0].roundTripMaxMs).toBe(400);
    expect(realms[0].queueWaitMaxMs).toBe(0);
    // The gap between 400 ms waited and 13 ms accounted for is the transport, which is exactly
    // what a round-trip column exists to expose.
    expect(realms[1].queueWaitMaxMs + realms[1].serviceMaxMs).toBe(13);
  });

  test('a call with no send stamp contributes no queue wait', ({ expect }) => {
    // The header is set by the client middleware; a caller without it still records service time,
    // and counting its absent wait as zero would drag the percentile down.
    const [realm] = diffRpc([], [reading({ calls: 1, samples: [{ serviceMs: 50, at: 10 }] })]);
    expect(realm.queueWaitMaxMs).toBe(0);
    expect(realm.serviceMaxMs).toBe(50);
    expect(realm.samples).toBe(1);
  });
});
