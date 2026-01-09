//
// Copyright 2023 DXOS.org
//

import { type Context, type Provider, createContext, useContext, useEffect } from 'react';

import { raise } from '@dxos/debug';
import { pick } from '@dxos/util';

import * as Common from '../common';
import { type AnyIntentResolver, type IntentContext } from '../plugin-intent';

import { usePluginManager } from './PluginManagerProvider';

const IntentContext: Context<IntentContext | undefined> = createContext<IntentContext | undefined>(undefined);

export const useIntentDispatcher = (): Pick<IntentContext, 'dispatch' | 'dispatchPromise'> => {
  const context = useContext(IntentContext) ?? raise(new Error('IntentContext not found'));
  return pick(context, ['dispatch', 'dispatchPromise']);
};

export const useIntentResolver = (module: string, resolver: AnyIntentResolver) => {
  const manager = usePluginManager();
  useEffect(() => {
    manager.context.contributeCapability({
      module,
      interface: Common.Capability.IntentResolver,
      implementation: resolver,
    });

    return () => manager.context.removeCapability(Common.Capability.IntentResolver, resolver);
  }, [module, resolver]);
};

export const IntentProvider: Provider<IntentContext | undefined> = IntentContext.Provider;
