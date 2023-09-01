//
// Copyright 2023 DXOS.org
//

import { Bug, IconProps } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal/react';
import React, { useEffect, useState } from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { Timer, UnsubscribeCallback } from '@dxos/async';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { DebugMain, DebugPanelKey, DebugSettings, DebugStatus, DevtoolsMain } from './components';
import { DEBUG_PLUGIN, DebugContext, DebugPluginProvides, DebugState } from './props';
import translations from './translations';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  let unsubscribe: UnsubscribeCallback;
  const state = deepSignal<DebugState>({ nodeIds: [], debug: localStorage.getItem(DebugPanelKey) === 'true' });

  const isDebug = (data: unknown) =>
    data &&
    typeof data === 'object' &&
    'id' in data &&
    typeof data.id === 'string' &&
    state.nodeIds.some((nodeId) => nodeId === data.id);

  return {
    meta: {
      id: DEBUG_PLUGIN,
    },
    ready: async () => {
      state.$debug?.subscribe((debug) => {
        localStorage.setItem(DebugPanelKey, debug ? 'true' : 'false');
      });
    },
    unload: async () => {
      unsubscribe?.();
    },
    provides: {
      translations,
      context: ({ children }) => {
        const [timer, setTimer] = useState<Timer>();
        useEffect(() => timer?.state.on((value) => !value && setTimer(undefined)), [timer]);
        useEffect(() => {
          timer?.stop();
        }, []);

        return (
          <DebugContext.Provider
            value={{
              running: !!timer,
              start: (cb, options) => {
                timer?.stop();
                setTimer(new Timer(cb).start(options));
              },
              stop: () => timer?.stop(),
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
          } else if (parent.id === 'space:all-spaces') {
            const unsubscribe = state.$debug?.subscribe((debug) => {
              debug
                ? parent.add({
                    id: 'devtools',
                    label: ['devtools label', { ns: DEBUG_PLUGIN }],
                    icon: (props) => <Bug {...props} />,
                    data: 'dxos-devtools',
                  })
                : parent.remove('devtools');
            });

            return () => unsubscribe?.();
            // TODO(burdon): Needs to trigger the graph plugin when settings are updated.
          } else if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const nodeId = parent.id + '-debug';
          state.nodeIds.push(nodeId);

          const unsubscribe = state.$debug?.subscribe((debug) => {
            debug
              ? parent.add({
                  id: nodeId,
                  label: 'Debug',
                  icon: (props: IconProps) => <Bug {...props} />,
                  data: { id: nodeId, space: parent.data },
                })
              : parent.remove(nodeId);
          });

          return () => {
            unsubscribe?.();
            state.nodeIds = state.nodeIds.filter((id) => id !== nodeId);
          };
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
            } else if (data === 'dxos-devtools') {
              return DevtoolsMain;
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
            return DebugStatus;
          }
        }

        return null;
      },
      components: {
        DebugMain,
      },
      debug: state,
    },
  };
};
