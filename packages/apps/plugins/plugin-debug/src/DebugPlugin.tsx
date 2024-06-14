//
// Copyright 2023 DXOS.org
//

import { Bug, type IconProps } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React, { useEffect, useState } from 'react';

import { parseClientPlugin, type ClientPluginProvides } from '@braneframe/plugin-client';
import { Graph, manageNodes } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { CollectionType } from '@braneframe/types';
import {
  getPlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  resolvePlugin,
  type IntentPluginProvides,
  type Plugin,
  type PluginDefinition,
} from '@dxos/app-framework';
import { EventSubscriptions, Timer } from '@dxos/async';
import { createStorageObjects } from '@dxos/client-services';
import { changeStorageVersionInMetadata } from '@dxos/echo-pipeline/testing';
import { LocalStorageStore } from '@dxos/local-storage';
import { type Client } from '@dxos/react-client';
import { SpaceState, isSpace } from '@dxos/react-client/echo';

import { DebugGlobal, DebugSettings, DebugSpace, DebugStatus, DevtoolsArticle, DevtoolsMain } from './components';
import meta, { DEBUG_PLUGIN } from './meta';
import translations from './translations';
import { DebugContext, type DebugSettingsProps, type DebugPluginProvides, DebugAction } from './types';

export const SETTINGS_KEY = DEBUG_PLUGIN + '/settings';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const settings = new LocalStorageStore<DebugSettingsProps>(DEBUG_PLUGIN, { debug: true, devtools: true });
  let intentPlugin: Plugin<IntentPluginProvides>;

  return {
    meta,
    ready: async (plugins) => {
      intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
      settings
        .prop({ key: 'debug', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'devtools', type: LocalStorageStore.bool({ allowUndefined: true }) });

      // TODO(burdon): Remove hacky dependency on global variable.
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
        builder: (plugins, graph) => {
          const subscriptions = new EventSubscriptions();
          const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

          // TODO(burdon): Combine nodes into single subtree.

          // Debug node.
          subscriptions.add(
            effect(() => {
              manageNodes({
                graph,
                condition: Boolean(settings.values.debug),
                removeEdges: true,
                nodes: [
                  {
                    id: 'dxos.org/plugin/debug/debug',
                    data: { graph: graphPlugin?.provides.graph },
                    properties: {
                      label: ['debug label', { ns: DEBUG_PLUGIN }],
                      icon: (props: IconProps) => <Bug {...props} />,
                    },
                    edges: [['root', 'inbound']],
                  },
                ],
              });
            }),
          );

          // Devtools node.
          subscriptions.add(
            effect(() => {
              manageNodes({
                graph,
                condition: Boolean(settings.values.devtools),
                removeEdges: true,
                nodes: [
                  {
                    // TODO(Zan): Removed `/` because it breaks deck layout reload. Fix?
                    id: 'dxos.org.plugin.debug.devtools',
                    data: 'devtools',
                    properties: {
                      label: ['devtools label', { ns: DEBUG_PLUGIN }],
                      icon: (props: IconProps) => <Bug {...props} />,
                    },
                    edges: [['root', 'inbound']],
                    nodes: [],
                  },
                ],
              });
            }),
          );

          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          if (!clientPlugin) {
            return;
          }

          const { unsubscribe } = clientPlugin.provides.client.spaces.subscribe((spaces) => {
            subscriptions.add(
              effect(() => {
                batch(() => {
                  spaces.forEach((space) => {
                    manageNodes({
                      graph,
                      condition: Boolean(settings.values.debug),
                      removeEdges: true,
                      nodes: [
                        {
                          id: `${space.key.toHex()}-debug`,
                          data: { space },
                          properties: {
                            label: ['debug label', { ns: DEBUG_PLUGIN }],
                            icon: (props: IconProps) => <Bug {...props} />,
                          },
                          edges: [[space.key.toHex(), 'inbound']],
                        },
                      ],
                    });
                  });
                });
              }),
            );
          });

          return () => {
            unsubscribe();
            subscriptions.clear();
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
          const { active, object } = data;

          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <DebugSettings settings={settings.values} /> : null;
            case 'status':
              return <DebugStatus />;
          }

          switch (role) {
            case 'main': {
              if (active === 'devtools' && settings.values.devtools) {
                return <DevtoolsMain />;
              }

              if (!active || typeof active !== 'object' || !settings.values.debug) {
                return null;
              }

              if ('space' in active && isSpace(active.space)) {
                return (
                  <DebugSpace
                    space={active.space}
                    onAddObjects={(objects) => {
                      if (!isSpace(active.space)) {
                        return;
                      }

                      const collection =
                        active.space.state.get() === SpaceState.READY &&
                        active.space.properties[CollectionType.typename];
                      if (!(collection instanceof CollectionType)) {
                        return;
                      }

                      void intentPlugin?.provides.intent.dispatch(
                        objects.map((object) => ({
                          action: SpaceAction.ADD_OBJECT,
                          data: { target: collection, object },
                        })),
                      );
                    }}
                  />
                );
              } else if ('graph' in active && active.graph instanceof Graph) {
                return <DebugGlobal graph={active.graph} />;
              }

              return null;
            }

            case 'article': {
              if (object === 'devtools' && settings.values.devtools) {
                return <DevtoolsArticle />;
              }
            }
          }

          return null;
        },
      },
    },
  };
};
