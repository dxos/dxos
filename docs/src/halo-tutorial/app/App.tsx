//
// Copyright 2026 DXOS.org
//

import './contact-book.css';

import * as Context from 'effect/Context';
import React, { useEffect, useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before the client.
import '@dxos/node-std/globals';
import { Client, type ClientServicesProvider } from '@dxos/client';
import { Config } from '@dxos/config';
import { Identity, Space } from '@dxos/halo';
import {
  makeIdentityService,
  makeSpaceService,
} from '@dxos/halo-adapter-client';
import { HaloProvider, type HaloServices } from '@dxos/halo-react';

import { ContactBook } from './ContactBook.tsx';

// #region config
/**
 * Keeps the app's keys and data on the device and reaches other devices
 * through DXOS's EDGE network, which relays invitations and replicates spaces.
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
/** Starts a client, and returns it with the HALO services it backs. */
export const openHalo = async (clientServices?: ClientServicesProvider) => {
  const client = new Client(
    clientServices
      ? { services: clientServices }
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
  const services = Context.empty().pipe(
    Context.add(Identity.Service, makeIdentityService(client)),
    Context.add(Space.Service, makeSpaceService(client)),
  );
  return { client, services };
};
// #endregion

/** The contact book as a project of its own, as StackBlitz runs it: one real client, kept on this device. */
export const App = () => {
  const [services, setServices] = useState<Context.Context<HaloServices>>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    openHalo().then(
      ({ services }) => setServices(services),
      (error) => setError(String(error)),
    );
  }, []);

  return (
    <div className='cb-root cb-app'>
      {error && <p className='cb-error cb-pad'>{error}</p>}
      {services && (
        <HaloProvider services={services}>
          <section className='cb-frame'>
            <ContactBook stage='recovery' />
          </section>
        </HaloProvider>
      )}
    </div>
  );
};
