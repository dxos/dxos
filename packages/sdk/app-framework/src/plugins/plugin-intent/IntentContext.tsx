//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext, type Provider } from 'react';

import { raise } from '@dxos/debug';
import { pick } from '@dxos/util';

import { type IntentContext } from './intent-dispatcher';

const IntentContext: Context<IntentContext | undefined> = createContext<IntentContext | undefined>(undefined);

export const useIntentDispatcher = (): Pick<IntentContext, 'dispatch' | 'dispatchPromise'> => {
  const context = useContext(IntentContext) ?? raise(new Error('IntentContext not found'));
  return pick(context, ['dispatch', 'dispatchPromise']);
};

export const IntentProvider: Provider<IntentContext | undefined> = IntentContext.Provider;
