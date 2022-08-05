//
// Copyright 2022 DXOS.org
//

import { Text } from 'ink';
import React, { useState } from 'react';

import { MenuItem, Module } from './components';
import { ModuleProvider } from './hooks';

export const Test = () => {
  const [initialized, setInitialized] = useState(true);

  return (
    <ModuleProvider value='root'>
      <Module
        id='root'
        items={[
          {
            id: 'x',
            label: 'Item X',
            component: () => (
              <Text>X</Text>
            )
          },
          {
            id: 'y',
            label: 'Item Y',
            exec: () => setInitialized(initialized => !initialized)
          },
          initialized && {
            id: 'z',
            label: 'Item Z',
            component: ({ parent }: { parent: string }) => (
              <Module
                id='second'
                parent={parent}
                items={[
                  {
                    id: 'a',
                    label: 'Item A',
                    component: () => (
                      <Text>A</Text>
                    )
                  },
                  {
                    id: 'b',
                    label: 'Item B',
                    component: () => (
                      <Text>B</Text>
                    )
                  },
                  {
                    id: 'c',
                    label: 'Item C',
                    component: ({ parent }: { parent: string }) => (
                      <Module
                        id='third'
                        parent={parent}
                        items={[
                          {
                            id: 'q',
                            label: 'Item Q',
                            component: () => (
                              <Text>Q</Text>
                            )
                          },
                          {
                            id: 'r',
                            label: 'Item R',
                            component: () => (
                              <Text>R</Text>
                            )
                          }
                        ]}
                      />
                    )
                  }
                ]}
              />
            )
          },
          {
            id: 'quit',
            label: 'Quit',
            exec: () => process.exit(0)
          }
        ].filter(Boolean) as MenuItem[]}
      />
    </ModuleProvider>
  );
};
