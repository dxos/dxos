//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import * as process from 'process';
import React, { useMemo } from 'react';

import { useClient, useProfile } from '@dxos/react-client';

import { ModuleProvider, useAppState } from '../hooks/index.js';
import { Config } from './Config.js';
import { createEchoMenu } from './echo/index.js';
import { createHaloMenu } from './halo/index.js';
import { createKubeMenu } from './kube/index.js';
import { createMeshMenu } from './mesh/index.js';
import { MenuItem, Module, Panel } from './util/index.js';

/**
 * Top-level app with menu.
 */
export const App = () => {
  const client = useClient();
  const profile = useProfile();
  const [{ error }] = useAppState();

  // TODO(burdon): Allow selection of menu item within menu.
  // TODO(burdon): Change focus when profile created (and menu changes).
  const items = useMemo<MenuItem[]>(() => [
    createHaloMenu(client),
    profile && createEchoMenu(),
    createMeshMenu(),
    createKubeMenu(),
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

      {error && (
        <Box borderStyle='single' borderColor='red'>
          <Text>{error}</Text>
        </Box>
      )}
    </ModuleProvider>
  );
};
