//
// Copyright 2020 DXOS.org
//

import { type Context, createContext } from 'react';

import { type Client, type SystemStatus } from '@dxos/client';

export type ClientContextProps = {
  client: Client;
  status?: SystemStatus | null;
};

/**
 * @internal Use ClientProvider to create or initialize the Client.
 */
export const ClientContext: Context<ClientContextProps | undefined> = createContext<ClientContextProps | undefined>(
  undefined,
);
