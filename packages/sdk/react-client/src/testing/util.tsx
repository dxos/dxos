//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Client, fromHost } from '@dxos/client';
import { type Space } from '@dxos/client/echo';

import { ClientContext, ClientProvider } from '../client';

// TODO(burdon): Reconcile with initializeClient.
export const createClient = async ({
  createIdentity,
  createSpace,
}: { createIdentity?: boolean; createSpace?: boolean } = {}) => {
  const client = new Client({ services: fromHost() });
  await client.initialize();
  if (createIdentity) {
    await client.halo.createIdentity();
  }

  let space: Space | undefined;
  if (createSpace) {
    space = await client.spaces.create();
    await client.spaces.isReady.wait();
  }

  return { client, space };
};

export const createClientContextProvider = async (client: Client) => {
  return ({ children }: any) => <ClientContext.Provider value={{ client }}>{children}</ClientContext.Provider>;
};

export const createClientProvider = async (client: Client) => {
  return ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
};
