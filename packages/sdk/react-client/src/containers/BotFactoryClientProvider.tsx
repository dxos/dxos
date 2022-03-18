//
// Copyright 2022 DXOS.org
//

import React, { ReactNode, useEffect, useState } from 'react';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { PublicKey } from '@dxos/crypto';
import { raise } from '@dxos/debug';
import { NetworkManager } from '@dxos/network-manager';

import { BotFactoryClientContext, useConfig } from '../hooks';

export interface BotFactoryClientProviderProps {
  children?: ReactNode
}

/**
 * BotFactoryClientProvider
 */
export const BotFactoryClientProvider = ({
  children
}: BotFactoryClientProviderProps) => {
  const config = useConfig();
  const [botFactoryClient, setBotFactoryClient] = useState<BotFactoryClient>();

  // TODO(burdon): Factor out.
  useEffect(() => {
    const signal = config.get('runtime.services.signal.server');
    const networkManager = new NetworkManager({
      signal: signal ? [signal] : undefined,
      ice: config.get('runtime.services.ice'),
      log: true
    });

    const botFactoryClient = new BotFactoryClient(networkManager);

    // TODO(burdon): Return asynchronously and start on-demand.
    setImmediate(async () => {
      // TODO(burdon): 'runtime.services.bot-factory.topic'
      const topic = config.get('runtime.services.bot.topic') ?? raise(new Error('Missing Bot factory topic.'));
      await botFactoryClient.start(PublicKey.from(topic));
      setBotFactoryClient(botFactoryClient);
    });

    return () => {
      void botFactoryClient.stop();
    };
  }, []);

  if (!botFactoryClient) {
    return null;
  }

  return (
    <BotFactoryClientContext.Provider value={botFactoryClient}>
      {children}
    </BotFactoryClientContext.Provider>
  );
};
