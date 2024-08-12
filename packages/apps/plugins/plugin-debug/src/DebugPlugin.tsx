//
// Copyright 2023 DXOS.org
//

import { Bug, Hammer, type IconProps } from '@phosphor-icons/react';
import React, { type ReactNode, useEffect, useState } from 'react';

import { type ClientPluginProvides } from '@braneframe/plugin-client';
import { createExtension, Graph, type Node } from '@braneframe/plugin-graph';
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
import { Timer } from '@dxos/async';
import { LocalStorageStore } from '@dxos/local-storage';
import { type Client } from '@dxos/react-client';
import { type Space, SpaceState, isSpace } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { DebugGlobal, DebugSettings, DebugSpace, DebugStatus, DevtoolsMain, Wireframe } from './components';
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
        .prop({ key: 'devtools', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({ key: 'wireframe', type: LocalStorageStore.bool({ allowUndefined: true }) });

      // TODO(burdon): Remove hacky dependency on global variable.
      // Used to test how composer handles breaking protocol changes.
      const composer = (window as any).composer;
      composer.changeStorageVersionInMetadata = async (version: number) => {
        const { changeStorageVersionInMetadata } = await import('@dxos/echo-pipeline/testing');
        const { createStorageObjects } = await import('@dxos/client-services');
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
        builder: (plugins) => {
          const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

          // TODO(burdon): Combine nodes into single subtree.

          return [
            // Devtools node.
            createExtension({
              id: 'dxos.org/plugin/debug/devtools',
              filter: (node): node is Node<null> => !!settings.values.devtools && node.id === 'root',
              connector: () => [
                {
                  // TODO(zan): Removed `/` because it breaks deck layout reload. Fix?
                  id: 'dxos.org.plugin.debug.devtools',
                  data: 'devtools',
                  type: 'dxos.org/plugin/debug/devtools',
                  properties: {
                    label: ['devtools label', { ns: DEBUG_PLUGIN }],
                    icon: (props: IconProps) => <Hammer {...props} />,
                    iconSymbol: 'ph--hammer--regular',
                  },
                },
              ],
            }),

            // Debug node.
            createExtension({
              id: 'dxos.org/plugin/debug/debug',
              filter: (node): node is Node<null> => !!settings.values.debug && node.id === 'root',
              connector: () => [
                {
                  id: 'dxos.org/plugin/debug/debug',
                  type: 'dxos.org/plugin/debug/debug',
                  data: { graph: graphPlugin?.provides.graph },
                  properties: {
                    label: ['debug label', { ns: DEBUG_PLUGIN }],
                    icon: (props: IconProps) => <Bug {...props} />,
                    iconSymbol: 'ph--bug--regular',
                  },
                },
              ],
            }),

            // Space debug nodes.
            createExtension({
              id: 'dxos.org/plugin/debug/spaces',
              filter: (node): node is Node<Space> => !!settings.values.debug && isSpace(node.data),
              connector: ({ node }) => {
                const space = node.data;
                return [
                  {
                    id: `${space.id}-debug`,
                    type: 'dxos.org/plugin/debug/space',
                    data: { space },
                    properties: {
                      label: ['debug label', { ns: DEBUG_PLUGIN }],
                      icon: (props: IconProps) => <Bug {...props} />,
                      iconSymbol: 'ph--bug--regular',
                    },
                  },
                ];
              },
            }),
          ];
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
        component: ({ name, data, role }) => {
          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <DebugSettings settings={settings.values} /> : null;
            case 'status':
              return <DebugStatus />;
          }

          const primary = data.active ?? data.object;
          let component: ReactNode;
          if (role === 'main' || role === 'article') {
            if (primary === 'devtools' && settings.values.devtools) {
              component = <DevtoolsMain />;
            } else if (!primary || typeof primary !== 'object' || !settings.values.debug) {
              component = null;
            } else if ('space' in primary && isSpace(primary.space)) {
              component = (
                <DebugSpace
                  space={primary.space}
                  onAddObjects={(objects) => {
                    if (!isSpace(primary.space)) {
                      return;
                    }

                    const collection =
                      primary.space.state.get() === SpaceState.SPACE_READY &&
                      primary.space.properties[CollectionType.typename];
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
            } else if ('graph' in primary && primary.graph instanceof Graph) {
              component = <DebugGlobal graph={primary.graph} />;
            } else {
              component = null;
            }
          }

          if (!component) {
            if (settings.values.wireframe) {
              if (role === 'main' || role === 'article' || role === 'section') {
                const primary = data.active ?? data.object;
                if (!(primary instanceof CollectionType)) {
                  return <Wireframe label={role} data={data} className='row-span-2' />;
                }
              }
            }

            return null;
          }

          switch (role) {
            case 'article':
              return (
                <div role='none' className='row-span-2 rounded-t-md overflow-x-auto'>
                  {component}
                </div>
              );
            case 'main':
              return (
                <Main.Content
                  classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}
                >
                  {component}
                </Main.Content>
              );
          }

          return null;
        },
      },
    },
  };
};
