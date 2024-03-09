//
// Copyright 2024 DXOS.org
//

import { createContext, type Context } from 'react';

import { type Space } from '@dxos/client-protocol';
import { type SignalBus } from '@dxos/functions-signal';

export type SignalBusContext = {
  getBus: (space: Space) => SignalBus;
};

export const SignalBusContext: Context<SignalBusContext | undefined> = createContext<SignalBusContext | undefined>(
  undefined,
);
