//
// Copyright 2023 DXOS.org
//

import { Bug, IconProps } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import type { ClientPluginProvides } from '@braneframe/plugin-client';
import { Timer } from '@dxos/async';
import { SpaceProxy } from '@dxos/client/echo';
import { LocalStorageStore } from '@dxos/local-storage';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { DebugMain, DebugSettings, DebugStatus, DevtoolsMain } from './components';
import { DEBUG_PLUGIN, DebugContext, DebugSettingsProps, DebugPluginProvides } from './props';
import translations from './translations';

export const SETTINGS_KEY = DEBUG_PLUGIN + '/settings';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const settings = new LocalStorageStore<DebugSettingsProps>();

  const nodeIds: string[] = [];
  const isDebug = (data: unknown) =>
    data &&
    typeof data === 'object' &&
    'id' in data &&
    typeof data.id === 'string' &&
    nodeIds.some((nodeId) => nodeId === data.id);

  return {
    meta: {
      id: DEBUG_PLUGIN,
    },
    ready: async (plugins) => {
      settings
        .bind(settings.values.$debug!, 'braneframe.plugin-debug.debug', LocalStorageStore.bool)
        .bind(settings.values.$devtools!, 'braneframe.plugin-debug.devtools', LocalStorageStore.bool);
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
        nodes: (parent) => {
          if (parent.id === 'space:all-spaces') {
            parent.addAction({
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

            const unsubscribe = settings.values.$devtools?.subscribe((debug) => {
              debug
                ? parent.add({
                    id: 'devtools',
                    label: ['devtools label', { ns: DEBUG_PLUGIN }],
                    icon: (props) => <Bug {...props} />,
                    data: 'devtools',
                  })
                : parent.remove('devtools');
            });

            return () => unsubscribe?.();
          } else if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const nodeId = parent.id + '-debug';
          nodeIds.push(nodeId);

          const unsubscribe = settings.values.$debug?.subscribe((debug) => {
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
          };
        },
      },
      intent: {
        resolver: async (intent, plugins) => {
          switch (intent.action) {
            case 'open-devtools': {
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
        if (data === 'dxos.org/plugin/splitview/ProfileSettings') {
          return DebugSettings;
        }

        if (!settings.values.debug) {
          return null;
        }

        switch (role) {
          case 'main':
            if (isDebug(data)) {
              return DebugMain;
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
