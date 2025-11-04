//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Client, type Config, fromHost } from '@dxos/client';
import { type Space } from '@dxos/client/echo';

import { ClientContext, ClientProvider } from '../client';

// TODO(burdon): Reconcile with initializeClient.
export const createClient = async ({
  config,
  createIdentity,
  createSpace,
}: { config?: Config; createIdentity?: boolean; createSpace?: boolean } = {}) => {
  const client = new Client({ config, services: fromHost(config) });
  await client.initialize();
  if (createIdentity) {
    await client.halo.createIdentity();
  }

  let space: Space | undefined;
  if (createSpace) {
    space = await client.spaces.create();
    await client.spaces.waitUntilReady();
  }

  return { client, space };
};

export const createClientContextProvider =
  async (client: Client) =>
  ({ children }: any) => <ClientContext.Provider value={{ client }}>{children}</ClientContext.Provider>;

export const createClientProvider =
  async (client: Client) =>
  ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
