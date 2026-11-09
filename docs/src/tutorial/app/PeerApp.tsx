//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { ClientProvider } from '@dxos/react-client';

import { Contacts, type Stage } from './Contacts.tsx';

// #region provider
/** One peer's copy of the app: the provider gives the hooks below it the peer's client. */
export const PeerApp = ({ client, space, stage }: { client: Client; space: Space; stage: Stage }) => (
  <ClientProvider client={client}>
    <Contacts space={space} stage={stage} />
  </ClientProvider>
);
// #endregion
