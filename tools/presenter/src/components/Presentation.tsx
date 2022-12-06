//
// Copyright 2022 DXOS.org
//

import React, { FC, useMemo } from 'react';

import * as ClientModule from '@dxos/client';
import * as ReactClientModule from '@dxos/react-client';

import { DeckProps } from './Deck';
import { SlideDeck } from './SlideDeck';

// NOTE: Due to ESM.
const { ClientProvider } = ReactClientModule as any;
const { Client, fromHost } = ClientModule as any;

export const Presentation: FC<DeckProps> = ({ title, slides }) => {
  const client = useMemo(() => {
    return new Client({ services: fromHost() });
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
