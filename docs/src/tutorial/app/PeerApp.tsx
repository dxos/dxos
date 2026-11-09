//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { Contacts, type ContactsProps } from './Contacts.tsx';

export type PeerAppProps = ContactsProps & { client: Client };

// #region provider
/** One peer's copy of the app; the hooks below the provider read this peer's client. */
export const PeerApp = ({ client, ...props }: PeerAppProps) => (
  <ClientProvider client={client}>
    <Contacts {...props} />
  </ClientProvider>
);
// #endregion
