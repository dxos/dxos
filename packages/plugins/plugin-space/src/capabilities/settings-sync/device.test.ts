//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import { awaitDevice } from './device';

type FakeDevice = { key: string };

/** Stands in for `client.halo`: `subscribe` replays, as `MulticastObservable` does. */
const makeHalo = (initial?: FakeDevice) => {
  let device = initial;
  const listeners = new Set<() => void>();
  return {
    get device() {
      return device;
    },
    devices: {
      subscribe: (callback: () => void) => {
        listeners.add(callback);
        callback();
        return { unsubscribe: () => listeners.delete(callback) };
      },
    },
    arrive: (next: FakeDevice) => {
      device = next;
      listeners.forEach((listener) => listener());
    },
    get listenerCount() {
      return listeners.size;
    },
  };
};

describe('awaitDevice', () => {
  test('resolves immediately when the device is already there', async () => {
    const halo = makeHalo({ key: 'device-a' });

    await expect(Effect.runPromise(awaitDevice(halo))).resolves.toEqual({ key: 'device-a' });
  });

  test('waits for a device that arrives later, which is the just-joined case', async () => {
    const halo = makeHalo();
    const pending = Effect.runPromise(awaitDevice(halo));

    // The replay on subscribe saw nothing, so this only resolves because the later change is heard.
    halo.arrive({ key: 'device-b' });

    await expect(pending).resolves.toEqual({ key: 'device-b' });
  });

  test('unsubscribes once resolved, so a settled wait leaves nothing behind', async () => {
    const halo = makeHalo();
    const pending = Effect.runPromise(awaitDevice(halo));
    halo.arrive({ key: 'device-c' });
    await pending;

    expect(halo.listenerCount).toBe(0);
  });
});
