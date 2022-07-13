//
// Copyright 2022 DXOS.org
//

import React, { ReactNode, useState } from 'react';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';

import { BotFactoryClientContext, createBotFactoryClient, useConfig } from '../hooks';

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

  useAsyncEffect(async () => {
    const botFactoryClient = await createBotFactoryClient(config);
    setBotFactoryClient(botFactoryClient);

    // TODO(burdon): Rename property: 'runtime.services.bot-factory.topic'
    const topic = config.get('runtime.services.bot.topic') ?? raise(new Error('Missing Bot factory topic.'));
    await botFactoryClient.start(PublicKey.from(topic));

    return () => {
      void botFactoryClient?.stop();
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
