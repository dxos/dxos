//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { Config } from '@dxos/config';
import { PublicKey } from '@dxos/crypto';
import { raise } from '@dxos/debug';
import { NetworkManager } from '@dxos/network-manager';

export const useBotFactoryClient = (config: Config): BotFactoryClient | undefined => {
  const [botFactoryClient, setBotFactoryClient] = useState<BotFactoryClient>();

  useEffect(() => {
    const networkManager = new NetworkManager({
      signal: config.get('runtime.services.signal.server') ? [config.get('runtime.services.signal.server')!] : undefined,
      ice: config.get('runtime.services.ice'),
      log: true
    });
    const botFactoryClient = new BotFactoryClient(networkManager);
    const topic = config.get('runtime.services.bot.topic') ??
      raise(new Error('Bot factory topic is not provided'));
    setImmediate(async () => {
      await botFactoryClient.start(PublicKey.from(topic));
      setBotFactoryClient(botFactoryClient);
    });
    return () => {
      void botFactoryClient.stop();
    };
  }, []);

  return botFactoryClient;
};
