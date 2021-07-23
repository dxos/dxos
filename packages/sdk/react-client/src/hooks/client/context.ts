//
// Copyright 2020 DXOS.org
//

import { createContext } from 'react';

import { Client } from '@dxos/client';

/**
 * https://reactjs.org/docs/context.html#reactcreatecontext
 */
export const ClientContext = createContext<Client | undefined>(undefined);
