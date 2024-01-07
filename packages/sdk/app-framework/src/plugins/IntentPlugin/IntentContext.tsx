//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext, type Provider } from 'react';

import { type UnsubscribeCallback } from '@dxos/async';

import { type IntentDispatcher, type IntentResolver } from './intent';

export type IntentContext = {
  dispatch: IntentDispatcher;
  registerResolver: (pluginId: string, resolver: IntentResolver) => UnsubscribeCallback;
};

const IntentContext: Context<IntentContext> = createContext<IntentContext>({
  dispatch: async () => {},
  registerResolver: () => () => {},
});

export const useIntent = () => useContext(IntentContext);

export const IntentProvider: Provider<IntentContext> = IntentContext.Provider;
