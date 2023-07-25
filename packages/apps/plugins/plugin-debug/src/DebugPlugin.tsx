//
// Copyright 2023 DXOS.org
//

import { Hammer, IconProps } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { getIndices } from '@braneframe/plugin-space';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { DebugMain } from './components';
import { DEBUG_PANEL, DebugContext, DebugPluginProvides } from './props';
import translations from './translations';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const nodeIds = new Set<string>();

  const isDebug = (datum: unknown) =>
    datum &&
    typeof datum === 'object' &&
    'node' in datum &&
    datum.node &&
    typeof datum.node === 'object' &&
    'id' in datum.node &&
    typeof datum.node.id === 'string' &&
    nodeIds.has(datum.node.id);

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

          const nodeId = parent.id + '-debug';
          nodeIds.add(nodeId);

          return [
            {
              id: nodeId,
              index: getIndices(1)[0], // TODO(burdon): Prevent drag?
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
            if (isDebug(datum)) {
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
