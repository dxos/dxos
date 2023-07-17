//
// Copyright 2023 DXOS.org
//

import { Hammer } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Testing as TestingType } from '@braneframe/types';
import { PluginDefinition } from '@dxos/react-surface';

import { TestingMain } from './components';
import { isTesting, TestingContext, TestingPluginProvides } from './props';
import translations from './translations';

export const TestingPlugin = (): PluginDefinition<TestingPluginProvides> => ({
  meta: {
    id: 'dxos.org/plugin/testing',
  },
  provides: {
    translations,
    context: ({ children }) => {
      const [running, setRunning] = useState<NodeJS.Timeout>();
      return (
        <TestingContext.Provider
          value={{
            running: !!running,
            start: (cb: () => void, interval: number) => {
              clearInterval(running);
              setRunning(setInterval(cb, interval));
            },
            stop: () => {
              clearInterval(running);
              setRunning(undefined);
            },
          }}
        >
          {children}
        </TestingContext.Provider>
      );
    },
    space: {
      types: [
        {
          // TODO(burdon): Callback to set default title, initial properties.
          id: 'create-Testing',
          testId: 'TestingPlugin.createTesting',
          label: ['create testing label', { ns: 'dxos.org/plugin/testing' }],
          icon: Hammer,
          Type: TestingType,
        },
      ],
    },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isTesting(datum[datum.length - 1])) {
            return TestingMain;
          } else {
            return null;
          }
        default:
          return null;
      }
    },
    components: {
      TestingMain,
    },
  },
});
