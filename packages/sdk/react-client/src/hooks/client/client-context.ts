//
// Copyright 2020 DXOS.org
//

import { Context, createContext } from 'react';

import { Client } from '@dxos/client';
import { ClientServices } from '@dxos/client-services';

type ClientContextProps = {
  client: Client;

  // Optionally expose services (e.g., for devtools).
  services?: ClientServices;
};

export const ClientContext: Context<ClientContextProps | undefined> = createContext<ClientContextProps | undefined>(
  undefined
);
