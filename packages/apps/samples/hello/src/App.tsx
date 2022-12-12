//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Config, Dynamics, Defaults } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { Welcome } from './Welcome';

const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <ClientProvider config={config}>
      <Welcome />
    </ClientProvider>
  );
};
