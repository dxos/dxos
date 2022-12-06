//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useState } from 'react';

import * as ClientModule from '@dxos/client';
import * as ReactClientModule from '@dxos/react-client';

import { DeckProps } from './Deck';
import { SlideDeck } from './SlideDeck';

// NOTE: Due to ESM.
const { ClientProvider } = ReactClientModule as any;
const { Client, fromHost } = ClientModule as any;

export const Presentation: FC<DeckProps> = ({ title, slides }) => {
  const [client, setClient] = useState<typeof Client>(null);
  useEffect(() => {
    setTimeout(async () => {
      const client = new Client({ services: fromHost() });
      await client.initialize();
      await client.halo.createProfile();
      const space = await client.echo.createSpace();
      await space.properties.set('title', 'Demo');
      setClient(client);
    });
  }, []);

  if (!client) {
    return null;
  }

  return (
    <ClientProvider client={client}>
      <SlideDeck title={title} slides={slides} />
    </ClientProvider>
  );
};
