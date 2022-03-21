//
// Copyright 2020 DXOS.org
//

import { createContext } from 'react';

import { Client } from '@dxos/client';

interface ClientContextProps {
  client: Client
}

export const ClientContext = createContext<ClientContextProps | undefined>(undefined);
