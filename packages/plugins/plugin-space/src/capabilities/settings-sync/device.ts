//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * The part of HALO this needs: the current device, and notification that the set has changed.
 * Structural so the wait can be exercised without a client.
 */
export type DeviceSource<T> = {
  readonly device: T | undefined;
  readonly devices: { subscribe: (callback: () => void) => { unsubscribe: () => void } };
};

/**
 * The current device, once HALO knows it.
 *
 * `halo.device` reads a stream that fills in asynchronously, so it is empty for a while on a device
 * that has just joined an existing identity — reading it once and giving up leaves that device with
 * no settings sync until its next reload. `subscribe` replays the current value, so a device that
 * is already there is seen with no gap.
 */
export const awaitDevice = <T>(halo: DeviceSource<T>): Effect.Effect<T> =>
  Effect.callback<T>((resume) => {
    // Unsubscribed here rather than in the returned finalizer, which only runs on interruption: a
    // wait that settles normally would otherwise leave its listener on HALO for the session.
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

    // `subscribe` replays synchronously, so a device already present settles the wait before there
    // is a subscription to release — hence releasing it here instead.
    if (settled) {
      subscription.unsubscribe();
    }

    return Effect.sync(() => subscription?.unsubscribe());
  });
