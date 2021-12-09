//
// Copyright 2021 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { BotFactoryClient } from '@dxos/bot-factory-client';

export const BotFactoryClientContext = createContext<BotFactoryClient | undefined>(undefined);

export const useBotFactoryClient = (): BotFactoryClient => {
  const botFactoryClient = useContext(BotFactoryClientContext) 
    ?? raise(new Error('`useBotFactoryClient` hook is called outside of RegistryContext.'));
  return botFactoryClient;
};
