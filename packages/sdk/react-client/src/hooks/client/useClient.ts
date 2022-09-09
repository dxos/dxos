//
// Copyright 2020 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { Client } from '@dxos/client';
import { raise } from '@dxos/debug';

interface ClientContextProps {
  client: Client
}

export const ClientContext: Context<ClientContextProps | undefined> =
  createContext<ClientContextProps | undefined>(undefined);

/**
 * Hook returning instance of DXOS client.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useClient = () => {
  const { client } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return client;
};
