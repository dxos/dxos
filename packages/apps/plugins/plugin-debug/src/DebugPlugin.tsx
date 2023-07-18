//
// Copyright 2023 DXOS.org
//

// import { Hammer } from '@phosphor-icons/react';
import React, { useState } from 'react';

// import { Debug as DebugType } from '@braneframe/types';
import { PluginDefinition } from '@dxos/react-surface';

import { DebugMain } from './components';
import { isDebug, DebugContext, DebugPluginProvides } from './props';
import translations from './translations';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => ({
  meta: {
    id: 'dxos.org/plugin/debug',
  },
  provides: {
    translations,
    context: ({ children }) => {
      const [running, setRunning] = useState<NodeJS.Timeout>();
      return (
        <DebugContext.Provider
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
        </DebugContext.Provider>
      );
    },
    // TODO(wittjosiah): Migrate to graph plugin.
    // space: {
    //   // TODO(burdon): Extend graph to allow creation of node without creating echo object.
    //   types: [
    //     {
    //       // TODO(burdon): Callback to set default title, initial properties.
    //       id: 'create-Debug',
    //       testId: 'DebugPlugin.createDebug',
    //       label: ['create debug label', { ns: 'dxos.org/plugin/debug' }],
    //       icon: Hammer,
    //       Type: DebugType,
    //     },
    //   ],
    // },
    component: (datum, role) => {
      switch (role) {
        case 'main':
          if (Array.isArray(datum) && isDebug(datum[datum.length - 1])) {
            return DebugMain;
          } else {
            return null;
          }
        default:
          return null;
      }
    },
    components: {
      DebugMain,
    },
  },
});
