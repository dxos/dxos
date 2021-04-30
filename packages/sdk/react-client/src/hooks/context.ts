//
// Copyright 2020 DXOS.org
//

import { createContext } from 'react';

import { Client } from '@dxos/client';

/**
 * https://reactjs.org/docs/context.html#reactcreatecontext
 * @type {React.Context}
 */
export const ClientContext = createContext<Client | undefined>(undefined);
