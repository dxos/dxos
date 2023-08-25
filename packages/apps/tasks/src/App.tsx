//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ClientProvider, Config, Dynamics, Local, Defaults } from '@dxos/react-client';

import { TaskList } from './TaskList';

// Dynamics allows configuration to be supplied by the hosting KUBE.
const config = async () => new Config(await Dynamics(), Local(), Defaults());

export const App = () => {
  return (
    <ClientProvider
      config={config}
      onInitialized={async (client) => {
        if (!client.halo.identity.get()) {
          await client.halo.createIdentity();
        }
      }}
    >
      <TaskList />
    </ClientProvider>
  );
};
