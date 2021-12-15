//
// Copyright 2021 DXOS.org
//

import { createContext, useContext } from 'react';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { raise } from '@dxos/debug';

export const BotFactoryClientContext = createContext<BotFactoryClient | undefined>(undefined);

export const useBotFactoryClient = (): BotFactoryClient => {
  const botFactoryClient = useContext(BotFactoryClientContext) ??
    raise(new Error('`useBotFactoryClient` hook is called outside of RegistryContext.'));
  return botFactoryClient;
};
