//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Client, type ClientServicesProvider } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Config } from '@dxos/config';

import { types } from '../schema.ts';
import { seed } from '../seed.ts';
import { Themed } from './ContactsEmbed.tsx';
import { PeerApp } from './PeerApp.tsx';

// #region config
/**
 * Keeps the app's data on the device and reaches other devices through DXOS's
 * EDGE network, which relays invitations and replicates spaces.
 */
const config = new Config({
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

/** The space the app showed last, which may be one it joined. */
const CURRENT_SPACE = 'contacts:space';
const seededKey = (space: Space) => `contacts:seeded:${space.id}`;

/**
 * The app as a project of its own, as StackBlitz runs it: one real client,
 * kept on this device.
 */
export const App = () => {
  const [opened, setOpened] = useState<{ client: Client; space: Space }>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    const open = async () => {
      const { client, space } = await openSpace();
      if (localStorage.getItem(seededKey(space)) === null) {
        seed(space.db);
        localStorage.setItem(seededKey(space), 'true');
      }
      const saved = client.spaces
        .get()
        .find((space) => space.id === localStorage.getItem(CURRENT_SPACE));
      await saved?.waitUntilReady();
      setOpened({ client, space: saved ?? space });
    };
    open().catch((error) => setError(String(error)));
  }, []);

  if (error) {
    return <p style={{ padding: '1rem' }}>{error}</p>;
  }
  return opened ? (
    <Themed>
      <div className='dx-grow'>
        <PeerApp
          client={opened.client}
          space={opened.space}
          stage='complete'
          onSpaceChange={(space) =>
            localStorage.setItem(CURRENT_SPACE, space.id)
          }
        />
      </div>
    </Themed>
  ) : null;
};
