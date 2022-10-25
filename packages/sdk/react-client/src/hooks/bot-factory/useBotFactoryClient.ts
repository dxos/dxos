//
// Copyright 2021 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { NetworkManager, createWebRTCTransportFactory } from '@dxos/client';
import { Config } from '@dxos/config';
import {
  MemorySignalManagerContext,
  MemorySignalManager,
  WebsocketSignalManager
} from '@dxos/messaging';

export const BotFactoryClientContext: Context<BotFactoryClient | undefined> =
  createContext<BotFactoryClient | undefined>(undefined);

export const useBotFactoryClient = (
  required = true
): BotFactoryClient | undefined => {
  const client = useContext(BotFactoryClientContext);
  if (required && !client) {
    throw new Error('Missing BotFactoryClientContext.');
  }

  return client;
};

const signalContext = new MemorySignalManagerContext();

export const createBotFactoryClient = async (
  config: Config
): Promise<BotFactoryClient> => {
  const signal = config.get('runtime.services.signal.server');
  const networkManager = new NetworkManager({
    signalManager: signal
      ? new WebsocketSignalManager([signal])
      : new MemorySignalManager(signalContext),
    transportFactory: createWebRTCTransportFactory({
      iceServers: config.get('runtime.services.ice')
    }),
    log: true
  });

  return new BotFactoryClient(networkManager);
};
