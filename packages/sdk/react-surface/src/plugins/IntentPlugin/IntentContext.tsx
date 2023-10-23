//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext, type Provider } from 'react';

import { type DispatchIntent } from './intent';

export type IntentContext = {
  dispatch: DispatchIntent;
};

const IntentContext: Context<IntentContext> = createContext<IntentContext>({ dispatch: async () => {} });

export const useIntent = () => useContext(IntentContext);

export const IntentProvider: Provider<IntentContext> = IntentContext.Provider;
