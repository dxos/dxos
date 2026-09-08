//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/** The part of HALO this needs: the current device, and notification that the set has changed. */
export type DeviceSource<T> = {
  readonly device: T | undefined;
  readonly devices: { subscribe: (callback: () => void) => { unsubscribe: () => void } };
};

/**
 * The current device, once HALO knows it. `halo.device` fills in asynchronously, so it is empty for
 * a while on a device that has just joined an existing identity.
 */
export const awaitDevice = <T>(halo: DeviceSource<T>): Effect.Effect<T> =>
  Effect.callback<T>((resume) => {
    // Unsubscribed here, not in the returned finalizer: that only runs on interruption.
    let subscription: { unsubscribe: () => void } | undefined;
    let settled = false;

    subscription = halo.devices.subscribe(() => {
      const current = halo.device;
      if (settled || !current) {
        return;
      }

      settled = true;
      subscription?.unsubscribe();
      resume(Effect.succeed(current));
    });

    // `subscribe` replays synchronously, so an already-present device settles before assignment.
    if (settled) {
      subscription.unsubscribe();
    }

    return Effect.sync(() => subscription?.unsubscribe());
  });
