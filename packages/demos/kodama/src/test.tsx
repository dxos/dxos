//
// Copyright 2022 DXOS.org
//

import { Box, Text, render } from 'ink';
import React from 'react';

import { Module } from './components';
import { AppStateProvider, ModuleProvider } from './hooks';

const Test = () => {
  return (
    <Box flexDirection='column'>
      <Module
        id='root'
        items={[
          {
            id: 'test',
            label: 'Test',
            component: () => (
              <Text>Test</Text>
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

const init = () => {
  render(
    <AppStateProvider debug={true}>
      <ModuleProvider root='root'>
        <Test />
      </ModuleProvider>
    </AppStateProvider>
  );
};

init();
