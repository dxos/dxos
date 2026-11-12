//
// Copyright 2026 DXOS.org
//

import { Client, type ClientServicesProvider } from '@dxos/client';
import { Config } from '@dxos/config';

import { types } from './schema.ts';

// #region config
/**
 * Keeps the app's data on the device and reaches other devices through DXOS's
 * EDGE network, which relays invitations and replicates spaces.
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
/**
 * Starts a client that knows the app's types, gives it an identity the first
 * time, and opens the space the app keeps its records in, creating it the
 * first time.
 */
export const openSpace = async (services?: ClientServicesProvider) => {
  const client = new Client(
    services
      ? { types, services }
      : {
          types,
          config,
          // Keeps the database in the browser's private file system.
          createOpfsWorker: () =>
            new Worker(new URL('@dxos/client/opfs-worker', import.meta.url), {
              type: 'module',
            }),
        },
  );
  await client.initialize();
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space =
    client.spaces.get()[0] ??
    (await client.spaces.create({ name: 'Contacts' }));
  await space.waitUntilReady();
  return { client, space };
};
// #endregion
