//
// Copyright 2020 DXOS.org
//

import { type Context, createContext } from 'react';

import { type Client, type ClientServices, type SystemStatus } from '@dxos/client';

export type ClientContextProps = {
  client: Client;

  // Optionally expose services (e.g., for devtools).
  services?: ClientServices;

  // TODO(burdon): Why is this set externally?
  status?: SystemStatus | null;
};

/**
 * @internal Use ClientProvider to create or initialize the Client.
 */
export const ClientContext: Context<ClientContextProps | undefined> = createContext<ClientContextProps | undefined>(
  undefined,
);
