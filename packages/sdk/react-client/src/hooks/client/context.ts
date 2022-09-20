//
// Copyright 2020 DXOS.org
//

import { Context, createContext } from 'react';

import { Client } from '@dxos/client';

interface ClientContextProps {
  client: Client
}

export const ClientContext: Context<ClientContextProps | undefined> =
  createContext<ClientContextProps | undefined>(undefined);
