//
// Copyright 2026 DXOS.org
//

import { Client, type ClientServicesProvider } from '@dxos/client';

import { types } from './schema.ts';

// #region client
/** Starts a client that knows the app's types, gives it an identity, and creates the space the app keeps its records in. */
export const openContacts = async (services?: ClientServicesProvider) => {
  const client = new Client({ types, services });
  await client.initialize();
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = await client.spaces.create({ name: 'Contacts' });
  await space.waitUntilReady();
  return { client, space };
};
// #endregion
