import { createContext, Context } from 'react';
import { SignalBus } from '@dxos/functions';
import { Space } from '@dxos/client-protocol';

export type SignalBusContext = {
  getBus: (space: Space) => SignalBus;
};

export const SignalBusContext: Context<SignalBusContext | undefined> = createContext<SignalBusContext | undefined>(
  undefined,
);
