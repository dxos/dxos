//
// Copyright 2022 DXOS.org
//

import { Text, useFocus } from 'ink';
import React, { useEffect, useState } from 'react';

import { MenuItem, Module } from './components';
import { ModuleProvider } from './hooks';

export const Test = () => {
  const [initialized, setInitialized] = useState(true);

  // TODO(burdon): Remove ModulePanel/Toolbar.
  // TODO(burdon): Remove module from app-state.

  // TODO(burdon): Use module hook.
  // TODO(burdon): Able to select menu + subitem (via hook).
  const { focus } = useFocus({ isActive: false });
  useEffect(() => {
    focus('root');
  }, []);

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
