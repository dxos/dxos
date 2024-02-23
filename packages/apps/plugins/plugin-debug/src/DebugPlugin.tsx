//
// Copyright 2023 DXOS.org
//

import { Bug, type IconProps } from '@phosphor-icons/react';
import { batch } from '@preact/signals-core';
import React, { useEffect, useState } from 'react';

import { type ClientPluginProvides } from '@braneframe/plugin-client';
import { Graph } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { Folder } from '@braneframe/types';
import {
  getPlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  resolvePlugin,
  type Plugin,
  type PluginDefinition,
  type IntentPluginProvides,
} from '@dxos/app-framework';
import { Timer } from '@dxos/async';
import { createStorageObjects } from '@dxos/client-services';
import { changeStorageVersionInMetadata } from '@dxos/echo-pipeline/testing';
import { LocalStorageStore } from '@dxos/local-storage';
import { type Client } from '@dxos/react-client';
import { SpaceProxy } from '@dxos/react-client/echo';

import { DebugGlobal, DebugSettings, DebugSpace, DebugStatus, DevtoolsMain } from './components';
import meta, { DEBUG_PLUGIN } from './meta';
import translations from './translations';
import { DebugContext, type DebugSettingsProps, type DebugPluginProvides, DebugAction } from './types';

export const SETTINGS_KEY = DEBUG_PLUGIN + '/settings';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const settings = new LocalStorageStore<DebugSettingsProps>(DEBUG_PLUGIN);
  let intentPlugin: Plugin<IntentPluginProvides>;

  return {
    meta,
    ready: async () => {
      settings
        .prop(settings.values.$debug!, 'debug', LocalStorageStore.bool)
        .prop(settings.values.$devtools!, 'devtools', LocalStorageStore.bool);

      // TODO(burdon): Remove hacky dependency on global variable?
      // Used to test how composer handles breaking protocol changes.
      (window as any).changeStorageVersionInMetadata = async (version: number) => {
        const client: Client = (window as any).dxos.client;
        const config = client.config;
        await client.destroy();
        const { storage } = createStorageObjects(config.values?.runtime?.client?.storage ?? {});
        await changeStorageVersionInMetadata(storage, version);
        location.pathname = '/';
      };
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
        builder: ({ parent, plugins }) => {
          if (parent.id !== 'root') {
            return;
          }

          const subscriptions: (() => void)[] = [];

          // Devtools node.
          subscriptions.push(
            settings.values.$devtools!.subscribe((debug) => {
              if (debug) {
                parent.addNode(DEBUG_PLUGIN, {
                  id: 'devtools-debug-plugin',
                  label: ['devtools label', { ns: DEBUG_PLUGIN }],
                  icon: (props) => <Bug {...props} />,
                  data: 'devtools',
                });
              } else {
                parent.removeNode('devtools');
              }
            }),
          );

          const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
          intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;

          // Root debug node.
          subscriptions.push(
            settings.values.$debug!.subscribe((debug) => {
              const nodeId = 'debug';
              if (debug) {
                const [root] = parent.addNode(DEBUG_PLUGIN, {
                  id: nodeId,
                  label: ['debug label', { ns: DEBUG_PLUGIN }],
                  data: { graph: graphPlugin?.provides.graph },
                });

                root.addAction({
                  id: 'open-devtools',
                  label: ['open devtools label', { ns: DEBUG_PLUGIN }],
                  icon: (props) => <Bug {...props} />,
                  keyBinding: 'shift+meta+\\',
                  invoke: () =>
                    intentPlugin?.provides.intent.dispatch({
                      plugin: DEBUG_PLUGIN,
                      action: DebugAction.OPEN_DEVTOOLS,
                    }),
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
                        root.addNode(DEBUG_PLUGIN, {
                          id: `${space.key.toHex()}-debug`,
                          label: space.key.truncate(),
                          icon: (props: IconProps) => <Bug {...props} />,
                          data: { space },
                        });
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
            case DebugAction.OPEN_DEVTOOLS: {
              const clientPlugin = getPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');
              const client = clientPlugin.provides.client;
              const vaultUrl = client.config.values?.runtime?.client?.remoteSource ?? 'https://halo.dxos.org';

              // Check if we're serving devtools locally on the usual port.
              let devtoolsUrl = 'http://localhost:5174';
              try {
                // TODO(burdon): Test header to see if this is actually devtools.
                await fetch(devtoolsUrl);
              } catch {
                // Match devtools to running app.
                const isDev = window.location.href.includes('.dev.') || window.location.href.includes('localhost');
                devtoolsUrl = `https://devtools${isDev ? '.dev.' : '.'}dxos.org`;
              }

              window.open(`${devtoolsUrl}?target=${vaultUrl}`, '_blank');
              return { data: true };
            }
          }
        },
      },
      surface: {
        component: ({ data, role }) => {
          const { active } = data;
          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <DebugSettings settings={settings.values} /> : null;
            case 'status':
              return <DebugStatus />;
          }

          if (!settings.values.debug) {
            return null;
          }

          switch (role) {
            case 'main':
              return active === 'devtools' ? (
                <DevtoolsMain />
              ) : !active || typeof active !== 'object' ? null : 'space' in active &&
                active.space instanceof SpaceProxy ? (
                <DebugSpace
                  space={active.space}
                  onAddObjects={(objects) => {
                    if (!(active.space instanceof SpaceProxy)) {
                      return;
                    }

                    const folder = active.space.properties[Folder.schema.typename];
                    if (!(folder instanceof Folder)) {
                      return;
                    }

                    void intentPlugin?.provides.intent.dispatch(
                      objects.map((object) => ({
                        action: SpaceAction.ADD_OBJECT,
                        data: { target: folder, object },
                      })),
                    );
                  }}
                />
              ) : 'graph' in active && active.graph instanceof Graph ? (
                <DebugGlobal graph={active.graph} />
              ) : null;
          }

          return null;
        },
      },
    },
  };
};
