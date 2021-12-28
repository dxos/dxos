//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { PublicKey } from '@dxos/crypto';
import { raise } from '@dxos/debug';

import { useClient, useConfig } from '../client';

export const useBotFactoryClient = (): BotFactoryClient | undefined => {
  const [botFactoryClient, setBotFactoryClient] = useState<BotFactoryClient>();

  const client = useClient();
  const config = useConfig();

  useEffect(() => {
    const botFactoryClient = new BotFactoryClient(client.echo.networkManager);
    const topic = config.get('services.bot.topic') ??
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
