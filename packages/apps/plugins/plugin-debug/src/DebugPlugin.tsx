//
// Copyright 2023 DXOS.org
//

import { Bug, IconProps } from '@phosphor-icons/react';
import { batch } from '@preact/signals-react';
import React, { useEffect, useState } from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { GraphPluginProvides } from '@braneframe/plugin-graph';
import { Timer } from '@dxos/async';
import { LocalStorageStore } from '@dxos/local-storage';
import { getPlugin, PluginDefinition } from '@dxos/react-surface';

import { DebugMain, DebugSettings, DebugStatus, DevtoolsMain } from './components';
import { DEBUG_PLUGIN, DebugContext, DebugSettingsProps, DebugPluginProvides } from './props';
import translations from './translations';

export const SETTINGS_KEY = DEBUG_PLUGIN + '/settings';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const settings = new LocalStorageStore<DebugSettingsProps>('braneframe.plugin-debug');

  const nodeIds = new Set<string>();
  const isDebug = (data: unknown) =>
    data && typeof data === 'object' && 'id' in data && typeof data.id === 'string' && nodeIds.has(data.id);

  return {
    meta: {
      id: DEBUG_PLUGIN,
    },
    ready: async () => {
      settings
        .prop(settings.values.$debug!, 'debug', LocalStorageStore.bool)
        .prop(settings.values.$devtools!, 'devtools', LocalStorageStore.bool);
    },
    unload: async () => {
      settings.close();
    },
    provides: {
      settings: settings.values,
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
        withPlugins: (plugins) => (parent) => {
          if (parent.id !== 'root') {
            return;
          }

          const subscriptions: (() => void)[] = [];

          // Devtools node.
          subscriptions.push(
            settings.values.$devtools!.subscribe((debug) => {
              if (debug) {
                parent.addNode(DEBUG_PLUGIN, {
                  id: 'devtools',
                  label: ['devtools label', { ns: DEBUG_PLUGIN }],
                  icon: (props) => <Bug {...props} />,
                  data: 'devtools',
                  properties: {
                    persistenceClass: 'appState',
                  },
                });
              } else {
                parent.removeNode('devtools');
              }
            }),
          );

          const graphPlugin = getPlugin<GraphPluginProvides>(plugins, 'dxos.org/plugin/graph');

          // Root debug node.
          subscriptions.push(
            settings.values.$debug!.subscribe((debug) => {
              const nodeId = parent.id + '_debug';
              nodeIds.add(nodeId);
              if (debug) {
                const [root] = parent.addNode(DEBUG_PLUGIN, {
                  id: nodeId,
                  label: 'Debug',
                  data: { id: nodeId, graph: graphPlugin?.provides.graph() },
                });

                root.addAction({
                  id: 'open-devtools',
                  label: ['open devtools label', { ns: DEBUG_PLUGIN }],
                  icon: (props) => <Bug {...props} />,
                  intent: {
                    plugin: DEBUG_PLUGIN,
                    action: 'open-devtools',
                  },
                  properties: {
                    testId: 'spacePlugin.openDevtools',
                  },
                });

                const clientPlugin = getPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
                subscriptions.push(
                  // TODO(burdon): Remove if hidden.
                  clientPlugin.provides.client.spaces.subscribe((spaces) => {
                    batch(() => {
                      spaces.forEach((space) => {
                        const nodeId = parent.id + '_debug_' + space.key.toHex();
                        if (!nodeIds.has(nodeId)) {
                          nodeIds.add(nodeId);
                          root.addNode(DEBUG_PLUGIN, {
                            id: nodeId,
                            label: space.key.truncate(),
                            icon: (props: IconProps) => <Bug {...props} />,
                            data: { id: nodeId, graph: graphPlugin?.provides.graph(), space },
                          });
                        }
                      });
                    });
                  }).unsubscribe,
                );
              } else {
                parent.removeNode(nodeId);
              }
            }),
          );

          return () => {
            subscriptions.forEach((unsubscribe) => unsubscribe());
          };
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          switch (intent.action) {
            case 'open-devtools': {
              const clientPlugin = getPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
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
        if (data === 'dxos.org/plugin/splitview/ProfileSettings') {
          return DebugSettings;
        }

        if (!settings.values.debug) {
          return null;
        }

        switch (role) {
          case 'main':
            if (isDebug(data)) {
              return DebugMain; // TODO(burdon): Convert to render for type safety.
            } else if (data === 'devtools') {
              return DevtoolsMain;
            }
            break;
          case 'status':
            return DebugStatus;
        }

        return null;
      },
      components: {
        DebugMain,
      },
    },
  };
};
