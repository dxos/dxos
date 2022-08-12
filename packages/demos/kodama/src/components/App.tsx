//
// Copyright 2022 DXOS.org
//

import * as process from 'process';
import React, { useMemo } from 'react';

import { useClient, useProfile } from '@dxos/react-client';

import { ModuleProvider } from '../hooks';
import { Config } from './Config';
import { createEchoMenu } from './echo';
import { createHaloMenu } from './halo';
import { createMeshMenu } from './mesh';
import { MenuItem, Module, Panel } from './util';

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
    createMeshMenu(client),
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
