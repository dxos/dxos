//
// Copyright 2023 DXOS.org
//

import { Bug, IconProps } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { ClientPluginProvides } from '@braneframe/plugin-client';
import { SETTINGS_PLUGIN, SettingsPluginProvides, SettingsStore } from '@braneframe/plugin-settings';
import { Timer } from '@dxos/async';
import { SpaceProxy } from '@dxos/client/echo';
import { findPlugin, PluginDefinition } from '@dxos/react-surface';

import { DebugMain, DebugSettings, DebugStatus } from './components';
import { DEBUG_PLUGIN, DebugContext, DebugPluginProvides } from './props';
import translations from './translations';

export const SETTINGS_KEY = DEBUG_PLUGIN + '/settings';

export const DebugPlugin = (): PluginDefinition<DebugPluginProvides> => {
  const nodeIds = new Set<string>();
  let settingsStore: SettingsStore | undefined;

  const isDebug = (data: unknown) =>
    data && typeof data === 'object' && 'id' in data && typeof data.id === 'string' && nodeIds.has(data.id);

  return {
    meta: {
      id: DEBUG_PLUGIN,
    },
    ready: async (plugins) => {
      // TODO(burdon): Copy pattern (with PLUGIN const).
      const settingsPlugin = findPlugin<SettingsPluginProvides>(plugins, SETTINGS_PLUGIN);
      settingsStore = settingsPlugin?.provides.store;
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
          } else if (!(parent.data instanceof SpaceProxy) || !settingsStore?.getKey(SETTINGS_KEY)) {
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
            return settingsStore?.getKey(SETTINGS_KEY) ? DebugMain : null;
          }
          case 'status': {
            return settingsStore?.getKey(SETTINGS_KEY) ? DebugStatus : null;
          }
          case 'dialog': {
            return data === 'dxos.org/plugin/splitview/ProfileSettings' ? DebugSettings : null;
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
