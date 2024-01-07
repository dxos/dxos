//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext, type Provider } from 'react';
import { useEffect } from 'react';

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

/**
 * @deprecated
 * TODO(burdon): Use useIntentDispatcher.
 */
export const useIntent = () => useContext(IntentContext);

// TODO(burdon): Dispatch or Dispatcher?
export const useIntentDispatcher = (): IntentDispatcher => {
  const { dispatch } = useIntent();
  return dispatch;
};

export const useIntentResolver = (plugin: string, resolver: IntentResolver) => {
  const { registerResolver } = useIntent();
  useEffect(() => {
    return registerResolver(plugin, resolver);
  }, [plugin, resolver]);
};

export const IntentProvider: Provider<IntentContext> = IntentContext.Provider;
