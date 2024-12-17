//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext, type Provider, useEffect } from 'react';

import { raise } from '@dxos/debug';
import { pick } from '@dxos/util';

import { type AnyIntentResolver, type IntentContext } from './intent-dispatcher';

const IntentContext: Context<IntentContext | undefined> = createContext<IntentContext | undefined>(undefined);

export const useIntentDispatcher = (): Pick<IntentContext, 'dispatch' | 'dispatchPromise'> => {
  const context = useContext(IntentContext) ?? raise(new Error('IntentContext not found'));
  return pick(context, ['dispatch', 'dispatchPromise']);
};

export const useIntentResolver = (pluginId: string, resolver: AnyIntentResolver) => {
  const { registerResolver } = useContext(IntentContext) ?? raise(new Error('IntentContext not found'));
  useEffect(() => {
    return registerResolver(pluginId, resolver);
  }, [pluginId, resolver]);
};

export const IntentProvider: Provider<IntentContext | undefined> = IntentContext.Provider;
