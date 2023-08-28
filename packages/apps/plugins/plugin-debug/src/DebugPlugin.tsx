//
// Copyright 2023 DXOS.org
//

import { Bug, IconProps } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { SpaceStatus } from '@braneframe/plugin-space/dist/types/src/components';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { DebugMain, DebugPanelKey, DebugSettings } from './components';
import { DEBUG_PLUGIN, DebugContext, DebugPluginProvides } from './props';
import translations from './translations';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const nodeIds = new Set<string>();

  const isDebug = (data: unknown) =>
    data && typeof data === 'object' && 'id' in data && typeof data.id === 'string' && nodeIds.has(data.id);

  return {
    meta: {
      id: DEBUG_PLUGIN,
    },
    provides: {
      translations,
      context: ({ children }) => {
        const [running, setRunning] = useState(false);
        const timer = useRef<NodeJS.Timer>();
        const stop = () => {
          clearInterval(timer.current);
          timer.current = undefined;
          setRunning(false);
        };

        useEffect(() => {
          stop();
        }, []);

        return (
          <DebugContext.Provider
            value={{
              running,
              start: (cb, options = {}) => {
                // TODO(burdon): Intervals are paused in Chrome when tab is not visible. Use Web Worker.
                // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
                // https://stackoverflow.com/questions/5927284/how-can-i-make-setinterval-also-work-when-a-tab-is-inactive-in-chrome
                let i = 0;
                clearInterval(timer.current);
                timer.current = setInterval(() => {
                  // TODO(burdon): Overflows and doesn't stop.
                  if ((options.count && i >= options.count) || cb(i) === false) {
                    stop();
                  } else {
                    i++;
                  }
                }, Math.max(10, options.interval ?? 100));

                setRunning(true);
              },
              stop,
            }}
          >
            {children}
          </DebugContext.Provider>
        );
      },
      graph: {
        nodes: (parent) => {
          if (parent.id === 'root') {
            parent.addAction({
              id: 'open-devtools',
              label: ['open devtools label', { ns: DEBUG_PLUGIN }],
              icon: (props) => <Bug {...props} />,
              intent: {
                plugin: DEBUG_PLUGIN,
                action: 'debug-openDevtools',
              },
              properties: {
                testId: 'spacePlugin.openDevtools',
              },
            });
            return;
            // TODO(burdon): Needs to trigger the graph plugin when settings are updated.
          } else if (!(parent.data instanceof SpaceProxy) || !localStorage.getItem(DebugPanelKey)) {
            return;
          }

          const nodeId = parent.id + '-debug';
          nodeIds.add(nodeId);

          parent.add({
            id: nodeId,
            label: 'Debug',
            icon: (props: IconProps) => <Bug {...props} />,
            data: { id: nodeId, space: parent.data },
          });
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
                window.open(`https://devtools.dev.dxos.org/?target=${vaultUrl}`);
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
          case 'status': {
            return SpaceStatus;
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
