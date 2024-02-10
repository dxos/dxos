//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext, type Provider } from 'react';
import { useEffect } from 'react';

import type { UnsubscribeCallback } from '@dxos/async';

import type { Intent, IntentDispatcher, IntentResolver, IntentResult } from './intent';

export type IntentExecution = {
  intent: Intent;
  result: IntentResult;
};

export type IntentContext = {
  dispatch: IntentDispatcher;
  undo: () => Promise<IntentResult | void>;
  history: IntentExecution[][];
  registerResolver: (pluginId: string, resolver: IntentResolver) => UnsubscribeCallback;
};

const IntentContext: Context<IntentContext> = createContext<IntentContext>({
  dispatch: async () => ({}),
  undo: async () => ({}),
  history: [],
  registerResolver: () => () => {},
});

/**
 * @deprecated Prefer granular hooks.
 */
// TODO(burdon): Remove. Use useIntentDispatcher.
export const useIntent = () => useContext(IntentContext);

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
