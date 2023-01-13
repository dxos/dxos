//
// Copyright 2022 DXOS.org
//

import { Box, Text } from 'ink';
import * as process from 'process';
import React, { useMemo } from 'react';

import { useClient, useIdentity } from '@dxos/react-client';

import { ModuleProvider, useAppState } from '../hooks';
import { Config } from './Config';
import { createEchoMenu } from './echo';
import { createHaloMenu } from './halo';
import { createKubeMenu } from './kube';
import { createMeshMenu } from './mesh';
import { MenuItem, Module, Panel } from './util';

/**
 * Top-level app with menu.
 */
export const App = () => {
  const client = useClient();
  const profile = useIdentity();
  const [{ error }] = useAppState();

  // TODO(burdon): Allow selection of menu item within menu.
  // TODO(burdon): Change focus when profile created (and menu changes).
  const items = useMemo<MenuItem[]>(
    () =>
      [
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
      ].filter(Boolean) as MenuItem[],
    [profile]
  );

  return (
    <ModuleProvider root='root'>
      <Module id='root' items={items} />

      {error && (
        <Box borderStyle='single' borderColor='red'>
          <Text>{error}</Text>
        </Box>
      )}
    </ModuleProvider>
  );
};
