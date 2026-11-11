//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Client, type ClientServicesProvider } from '@dxos/client';
import { Config } from '@dxos/config';
import { type Identity, type Space } from '@dxos/halo';
import { layerClient } from '@dxos/halo-adapter-client';

// #region config
/**
 * Keeps the app's keys and data on the device and reaches other devices
 * through DXOS's EDGE network, which relays invitations and replicates spaces.
 */
export const config = new Config({
  runtime: {
    client: {
      storage: { persistent: true },
      edgeFeatures: {
        signaling: true,
        subductionReplicator: true,
        feedReplicator: true,
      },
    },
    services: {
      edge: { url: 'https://dxos.network/' },
      iceProviders: [{ urls: 'https://dxos.network/ice' }],
    },
  },
});
// #endregion

// #region client
/** The HALO services the app's code needs. */
export type Halo = Identity.Service | Space.Service;

/** Starts a client, and returns a function that runs HALO code against it. */
export const openHalo = async (services?: ClientServicesProvider) => {
  const client = new Client(
    services
      ? { services }
      : {
          config,
          // Keeps the device's keys and data in the browser's private file system.
          createOpfsWorker: () =>
            new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), {
              type: 'module',
            }),
        },
  );
  await client.initialize();

  const halo = layerClient(client);
  const run = <A, E>(effect: Effect.Effect<A, E, Halo>) =>
    Effect.runPromise(effect.pipe(Effect.provide(halo)));
  return { client, halo, run };
};
// #endregion
