//
// Copyright 2022 DXOS.org
//

import { useFocusManager } from 'ink';
import * as process from 'process';
import React, { useEffect, useMemo } from 'react';

import { Client } from '@dxos/client';
import { useClient, useProfile } from '@dxos/react-client';

import {
  createEchoModule,
  createHaloModule,
  Config,
  Module,
  ModulePanel,
  Panel
} from './components';
import { AppStateProvider } from './hooks';

const createRootModule = (client: Client): Module => {
  return {
    id: 'root',
    label: 'Root',
    modules: [
      createHaloModule(client),
      createEchoModule(client),
      {
        id: 'config',
        label: 'Config',
        component: () => (
          <Panel>
            <Config />
          </Panel>
        )
      },
      {
        id: 'quit',
        label: 'Quit',
        exec: () => {
          process.exit();
        }
      }
    ].filter(Boolean) as Module[]
  };
};

/**
 * Top-level app with menu.
 */
export const App = () => {
  const client = useClient();
  const profile = useProfile();
  const module = useMemo<Module>(() => createRootModule(client), [profile]);
  const { focusNext } = useFocusManager();

  useEffect(() => {
    focusNext();
  }, []);

  return (
    <AppStateProvider>
      <ModulePanel
        module={module}
      />
    </AppStateProvider>
  );
};
