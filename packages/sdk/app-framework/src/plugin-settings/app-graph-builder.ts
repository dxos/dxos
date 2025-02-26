//
// Copyright 2025 DXOS.org
//

import { createExtension, type Node } from '@dxos/app-graph';
import { type SettingsStore, type SettingsValue } from '@dxos/local-storage';
import { isNonNullable } from '@dxos/util';

import { SETTINGS_ID, SETTINGS_KEY, SETTINGS_PLUGIN, SettingsAction } from './actions';
import { Capabilities } from '../common';
import { contributes, type PluginMeta, type PluginsContext } from '../core';
import { createIntent } from '../plugin-intent';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${SETTINGS_PLUGIN}/action`,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: SETTINGS_PLUGIN,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(SettingsAction.Open));
          },
          properties: {
            label: ['open settings label', { ns: SETTINGS_PLUGIN }],
            icon: 'ph--gear--regular',
            keyBinding: {
              macos: 'meta+,',
              windows: 'alt+,',
            },
          },
        },
      ],
    }),
    createExtension({
      id: `${SETTINGS_PLUGIN}/core`,
      filter: (node): node is Node<null> => node.id === 'root',
      connector: () => [
        {
          id: SETTINGS_ID,
          type: SETTINGS_PLUGIN,
          properties: {
            label: ['app settings label', { ns: SETTINGS_PLUGIN }],
            icon: 'ph--gear--regular',
            disposition: 'pin-end',
            position: 'fallback',
            testId: 'treeView.appSettings',
          },
        },
      ],
    }),
    createExtension({
      id: `${SETTINGS_PLUGIN}/core-plugins`,
      filter: (node): node is Node<null> => node.id === SETTINGS_ID,
      connector: () => {
        const manager = context.requestCapability(Capabilities.PluginManager);
        const [settingsStore] = context.requestCapabilities(Capabilities.SettingsStore);
        return [
          ...manager.plugins
            .filter((plugin) => manager.core.includes(plugin.meta.id))
            .map((plugin): [PluginMeta, SettingsStore<SettingsValue>] | null => {
              const settings = settingsStore?.getStore(plugin.meta.id);
              if (!settings) {
                return null;
              }

              return [plugin.meta, settings];
            })
            .filter(isNonNullable)
            .map(([meta, settings]) => ({
              id: `${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}`,
              type: 'category',
              data: settings,
              properties: {
                label: meta.name ?? meta.id,
                icon: meta.icon ?? 'ph--circle--regular',
              },
            })),

          {
            id: `${SETTINGS_KEY}:custom-plugins`,
            type: 'collection',
            properties: {
              label: ['custom plugins label', { ns: SETTINGS_PLUGIN }],
              icon: 'ph--squares-four--regular',
              role: 'branch',
            },
          },
        ];
      },
    }),
    createExtension({
      id: `${SETTINGS_PLUGIN}/custom-plugins`,
      filter: (node): node is Node<null> => node.id === `${SETTINGS_KEY}:custom-plugins`,
      connector: () => {
        const manager = context.requestCapability(Capabilities.PluginManager);
        const [settingsStore] = context.requestCapabilities(Capabilities.SettingsStore);
        return manager.plugins
          .filter((plugin) => !manager.core.includes(plugin.meta.id))
          .map((plugin): [PluginMeta, SettingsStore<SettingsValue>] | null => {
            const settings = settingsStore?.getStore(plugin.meta.id);
            if (!settings) {
              return null;
            }

            return [plugin.meta, settings];
          })
          .filter(isNonNullable)
          .map(([meta, settings]) => ({
            id: `${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}`,
            type: 'category',
            data: settings,
            properties: {
              label: meta.name ?? meta.id,
              icon: meta.icon ?? 'ph--circle--regular',
            },
          }));
      },
    }),
  ]);
