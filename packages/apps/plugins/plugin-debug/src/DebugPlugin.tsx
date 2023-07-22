//
// Copyright 2023 DXOS.org
//

import { Hammer, IconProps } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { DebugMain } from './components';
import { DEBUG_PANEL, DebugContext, DebugPluginProvides } from './props';
import translations from './translations';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const nodeIds = new Set<string>();

  return {
    meta: {
      id: DEBUG_PANEL,
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
      graph: {
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const nodeId = 'debug';
          nodeIds.add(nodeId);

          return [
            {
              id: nodeId,
              index: 'a1',
              label: 'Debug',
              icon: (props: IconProps) => <Hammer {...props} />,
              data: { id: nodeId },
              parent,
            },
          ];
        },
      },
      component: (datum, role) => {
        switch (role) {
          case 'main':
            if (Array.isArray(datum) && nodeIds.has(datum[datum.length - 1].id)) {
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
  };
};
