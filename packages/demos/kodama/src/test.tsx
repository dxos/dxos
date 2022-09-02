//
// Copyright 2022 DXOS.org
//

import { Box, Text, render } from 'ink';
import React from 'react';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { Join, Module } from './components';
import { AppStateProvider, ModuleProvider, useModule } from './hooks';

const Test = () => {
  const [activePath] = useModule();

  return (
    <Box flexDirection='column'>
      <Box marginBottom={1}>
        <Text>{activePath}</Text>
      </Box>
      <Module
        id='root'
        items={[
          {
            id: 'test',
            label: 'Test',
            component: () => ( // TODO(burdon): Client Context.
              <Join />
            )
          },
          {
            id: 'sub',
            label: 'Sub Menu',
            component: ({ parent }) => (
              <Module
                id='sub'
                parent={parent}
                items={[
                  {
                    id: 'sub1',
                    label: 'Sub 1',
                    component: () => (
                      <Text>Sub 1</Text>
                    )
                  },
                  {
                    id: 'sub2',
                    label: 'Sub 2',
                    component: () => (
                      <Text>Sub 2</Text>
                    )
                  }
                ]}
              />
            )
          },
          {
            id: 'quit',
            label: 'Quit',
            exec: () => process.exit()
          }
        ]}
      />
    </Box>
  );
};

const init = async () => {
  const client = new Client({});
  await client.initialize();
  await client.halo.createProfile({ username: 'Test' });

  render(
    <ClientProvider client={client}>
      <AppStateProvider debug={true}>
        <ModuleProvider root='root'>
          <Test />
        </ModuleProvider>
      </AppStateProvider>
    </ClientProvider>
  );
};

void init();
