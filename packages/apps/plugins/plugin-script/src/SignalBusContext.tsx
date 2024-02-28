import { createContext, Context } from 'react';
import { SignalBus } from '@dxos/functions';

export type SignalBusContext = {
  signalBus: SignalBus;
};

export const SignalBusContext: Context<SignalBusContext | undefined> = createContext<SignalBusContext | undefined>(
  undefined,
);
