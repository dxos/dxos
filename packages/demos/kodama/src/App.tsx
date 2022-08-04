//
// Copyright 2022 DXOS.org
//

import { useFocus } from 'ink';
import * as process from 'process';
import React, { useEffect, useMemo } from 'react';

import { Client, Party } from '@dxos/client';
import { useClient, useParty, useProfile } from '@dxos/react-client';

import {
  createEchoModule,
  createHaloModule,
  Config,
  Module,
  ModulePanel,
  Panel
} from './components';
import { useAppState } from './hooks';

const createRootModule = (client: Client, party?: Party): Module => {
  return {
    id: 'root',
    label: 'Root',
    modules: [
      createHaloModule(client),
      createEchoModule(client, party),
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
  const [{ partyKey }] = useAppState();
  const party = useParty(partyKey);
  const module = useMemo<Module>(() => createRootModule(client, party), [profile, party]);
  const { focus } = useFocus({ isActive: false });

  // Focus first element.
  useEffect(() => {
    focus(module.id);
  }, [module]);

  return (
    <ModulePanel
      module={module}
    />
  );
};
