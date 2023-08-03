//
// Copyright 2023 DXOS.org
//

import { Hammer, IconProps } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { DebugMain, DebugPanelKey, DebugSettings } from './components';
import { DEBUG_PLUGIN, DebugContext, DebugPluginProvides } from './props';
import translations from './translations';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const nodeIds = new Set<string>();

  const isDebug = (data: unknown) =>
    data &&
    typeof data === 'object' &&
    'node' in data &&
    data.node &&
    typeof data.node === 'object' &&
    'id' in data.node &&
    typeof data.node.id === 'string' &&
    nodeIds.has(data.node.id);

  return {
    meta: {
      id: DEBUG_PLUGIN,
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
          // TODO(burdon): Needs to trigger the graph plugin when settings are updated.
          console.log('###', !!localStorage.getItem(DebugPanelKey));
          if (!(parent.data instanceof SpaceProxy) || !localStorage.getItem(DebugPanelKey)) {
            return [];
          }

          const nodeId = parent.id + '-debug';
          nodeIds.add(nodeId);

          return [
            {
              id: nodeId,
              index: 'a0', // TODO(burdon): Prevent drag? Dragging causes bug.
              label: 'Debug',
              icon: (props: IconProps) => <Hammer {...props} />,
              data: { id: nodeId },
              parent,
            },
          ];
        },
        actions: (parent) => {
          if (parent.id !== 'root') {
            return [];
          }

          return [
            {
              id: 'open-devtools',
              index: 'z', // indices[2],
              testId: 'spacePlugin.openDevtools',
              label: ['open devtools label', { ns: DEBUG_PLUGIN }],
              icon: (props) => <Hammer {...props} />,
              intent: {
                plugin: DEBUG_PLUGIN,
                action: 'debug-openDevtools',
              },
            },
          ];
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          switch (intent.action) {
            case 'debug-openDevtools': {
              // TODO(burdon): Access config.
              const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
              if (!clientPlugin) {
                throw new Error('Client plugin not found');
              }

              const client = clientPlugin.provides.client;
              const vaultUrl = client.config.values?.runtime?.client?.remoteSource;
              if (vaultUrl) {
                window.open(`https://devtools.dev.dxos.org/?target=vault:${vaultUrl}`);
              }
              return true;
            }
          }
        },
      },
      component: (data, role) => {
        switch (role) {
          case 'main': {
            if (isDebug(data)) {
              return DebugMain;
            }
            break;
          }
          case 'dialog': {
            if (data === 'dxos.org/plugin/splitview/ProfileSettings') {
              return DebugSettings;
            }
            break;
          }
        }

        return null;
      },
      components: {
        DebugMain,
      },
    },
  };
};
