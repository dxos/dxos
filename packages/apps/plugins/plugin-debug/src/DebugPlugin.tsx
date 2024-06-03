//
// Copyright 2023 DXOS.org
//

import { Bug, type IconProps } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React, { useEffect, useState } from 'react';

import { parseClientPlugin, type ClientPluginProvides } from '@braneframe/plugin-client';
import { manageNodes } from '@braneframe/plugin-graph';
import { getPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { EventSubscriptions, Timer } from '@dxos/async';
import { createStorageObjects } from '@dxos/client-services';
import { changeStorageVersionInMetadata } from '@dxos/echo-pipeline/testing';
import { LocalStorageStore } from '@dxos/local-storage';
import { type Client } from '@dxos/react-client';

import { DebugSettings, DebugStatus, DevtoolsMain } from './components';
import meta, { DEBUG_PLUGIN } from './meta';
import translations from './translations';
import { DebugContext, type DebugSettingsProps, type DebugPluginProvides, DebugAction } from './types';

export const SETTINGS_KEY = DEBUG_PLUGIN + '/settings';

// TODO(burdon): Intent handler.
// TODO(burdon): Subscriptions.
// TODO(burdon): Providers.

// TODO(burdon): Reconcile debug/devtools plugins.

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const settings = new LocalStorageStore<DebugSettingsProps>(DEBUG_PLUGIN, { debug: true, devtools: true });
  return {
    meta,
    ready: async (plugins) => {
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

        // TODO(burdon): Remove.
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
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          if (!clientPlugin) {
            return;
          }

          // TODO(burdon): Factor out.
          const subscriptions = new EventSubscriptions();
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

          return () => {
            subscriptions.clear();
          };
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          switch (intent.action) {
            // TODO(burdon): Remove?
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
            case 'main':
            case 'article': {
              return active === 'devtools' && settings.values.devtools ? <DevtoolsMain /> : null;
            }
            case 'settings':
              return data.plugin === meta.id ? <DebugSettings settings={settings.values} /> : null;
            case 'status':
              return <DebugStatus />;
            default:
              return null;
          }
        },
      },
    },
  };
};
