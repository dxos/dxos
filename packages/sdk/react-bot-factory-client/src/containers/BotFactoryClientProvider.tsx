//
// Copyright 2021 DXOS.org
//

import React, { ReactNode, useEffect, useState } from 'react';

import { BotFactoryClient } from '@dxos/bot-factory-client';
import { useClient, useConfig } from '@dxos/react-client';
import { PublicKey } from '@dxos/crypto';

import { BotFactoryClientContext } from '../hooks';
import { raise } from '@dxos/debug';

export interface BotFactoryClientProviderProps {
  children: ReactNode | ReactNode[],
  placeholder?: React.ComponentType
}

export const BotFactoryClientProvider = ({ 
  children,
  placeholder: PlaceholderComponent
} : BotFactoryClientProviderProps) => {
  const [botFactoryClient, setBotFactoryClient] = useState<BotFactoryClient>();

  const client = useClient();
  const config = useConfig();

  useEffect(() => {
    setImmediate(async () => {
      const botFactoryClient = new BotFactoryClient(client.echo.networkManager);
      const topic = config.get('services.bot.topic') 
        ?? raise(new Error('Bot factory topic is not provided'));
      await botFactoryClient.start(PublicKey.from(topic));
      setBotFactoryClient(botFactoryClient);
    });
  });

  if (!botFactoryClient) {
    if (PlaceholderComponent) {
      return <PlaceholderComponent />;
    }

    return null;
  }

  return (
    <BotFactoryClientContext.Provider value={botFactoryClient}>
      {children}
    </BotFactoryClientContext.Provider>
  );
};
