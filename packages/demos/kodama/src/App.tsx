//
// Copyright 2022 DXOS.org
//

import * as process from 'process';
import React, { useMemo } from 'react';

import { useClient, useProfile } from '@dxos/react-client';

import {
  createEchoMenu,
  createHaloMenu,
  Config,
  Module,
  Panel, MenuItem
} from './components';
import { ModuleProvider } from './hooks';

/**
 * Top-level app with menu.
 */
export const App = () => {
  const client = useClient();
  const profile = useProfile();

  // TODO(burdon): Allow selection of menu item within menu.
  // TODO(burdon): Change focus when profile created (and menu changes).
  const items = useMemo<MenuItem[]>(() => [
    createHaloMenu(client),
    profile && createEchoMenu(),
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
  ].filter(Boolean) as MenuItem[], [profile]);

  return (
    <ModuleProvider root='root'>
      <Module
        id='root'
        items={items}
      />
    </ModuleProvider>
  );
};
