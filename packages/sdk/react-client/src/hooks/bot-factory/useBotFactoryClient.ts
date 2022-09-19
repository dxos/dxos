//
// Copyright 2021 DXOS.org
//

import { createContext, useContext } from 'react';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { NetworkManager } from '@dxos/client';
import { Config } from '@dxos/config';
import { MemorySignalManagerContext, MemorySignalManager, WebsocketSignalManager } from '@dxos/messaging';

export const BotFactoryClientContext = createContext<BotFactoryClient | undefined>(undefined);

export const useBotFactoryClient = (required = true): BotFactoryClient | undefined => {
  const client = useContext(BotFactoryClientContext);
  if (required && !client) {
    throw new Error('Missing BotFactoryClientContext.');
  }

  return client;
};

const signalContext = new MemorySignalManagerContext();

export const createBotFactoryClient = async (config: Config): Promise<BotFactoryClient> => {
  const signal = config.get('runtime.services.signal.server');
  const networkManager = new NetworkManager({
    // TODO(mykola): SignalManager need to be subscribed for message receiving first.
    signalManager: signal ? new WebsocketSignalManager([signal]) : new MemorySignalManager(signalContext),
    ice: config.get('runtime.services.ice'),
    log: true
  });

  return new BotFactoryClient(networkManager);
};
