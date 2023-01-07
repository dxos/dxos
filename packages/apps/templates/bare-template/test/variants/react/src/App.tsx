//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Config, Dynamics, Defaults } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

// include css files directly
import 'index.css';

// Dynamics allows configuration to be supplied by the hosting KUBE
const config = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <ClientProvider config={config}>
      <div>Your code goes here</div>
    </ClientProvider>
  );
};
