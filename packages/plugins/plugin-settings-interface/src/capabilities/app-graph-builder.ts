//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  type PluginMeta,
  type PluginsContext,
  SettingsAction,
} from '@dxos/app-framework';
import { type SettingsStore, type SettingsValue } from '@dxos/local-storage';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { nonNullable } from '@dxos/util';

import { SETTINGS_ID, SETTINGS_INTERFACE_PLUGIN } from '../meta';

export const SETTINGS_KEY = 'settings';

const core = [
  'dxos.org/plugin/deck',
  'dxos.org/plugin/files',
  'dxos.org/plugin/observability',
  'dxos.org/plugin/space',
  'dxos.org/plugin/token-manager',
];

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${SETTINGS_INTERFACE_PLUGIN}/action`,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: SETTINGS_INTERFACE_PLUGIN,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(SettingsAction.Open));
          },
          properties: {
            label: ['open settings label', { ns: SETTINGS_INTERFACE_PLUGIN }],
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
      id: `${SETTINGS_INTERFACE_PLUGIN}/core`,
      filter: (node): node is Node<null> => node.id === 'root',
      connector: () => [
        {
          id: SETTINGS_ID,
          type: SETTINGS_INTERFACE_PLUGIN,
          properties: {
            label: ['app settings label', { ns: SETTINGS_INTERFACE_PLUGIN }],
            icon: 'ph--gear--regular',
            disposition: 'pin-end',
            position: 'fallback',
            testId: 'treeView.appSettings',
          },
        },
      ],
    }),
    createExtension({
      id: `${SETTINGS_INTERFACE_PLUGIN}/core-plugins`,
      filter: (node): node is Node<null> => node.id === SETTINGS_ID,
      connector: () => {
        const manager = context.requestCapability(Capabilities.PluginManager);
        const [settingsStore] = context.requestCapabilities(Capabilities.SettingsStore);
        return [
          ...core
            .map((id): [PluginMeta, SettingsStore<SettingsValue>] | null => {
              const plugin = manager.plugins.find((plugin) => plugin.meta.id === id);
              if (!plugin) {
                return null;
              }

              const settings = settingsStore?.getStore(plugin.meta.id);
              if (!settings) {
                return null;
              }

              return [plugin.meta, settings];
            })
            .filter(nonNullable)
            .map(([meta, settings]) => ({
              id: `${SETTINGS_KEY}:${meta.id.split('/').at(-1)}`,
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
              label: ['custom plugins label', { ns: SETTINGS_INTERFACE_PLUGIN }],
              icon: 'ph--squares-four--regular',
              role: 'branch',
            },
          },
        ];
      },
    }),
    createExtension({
      id: `${SETTINGS_INTERFACE_PLUGIN}/custom-plugins`,
      filter: (node): node is Node<null> => node.id === `${SETTINGS_KEY}:custom-plugins`,
      connector: () => {
        const manager = context.requestCapability(Capabilities.PluginManager);
        const [settingsStore] = context.requestCapabilities(Capabilities.SettingsStore);
        return manager.plugins
          .filter((plugin) => !core.includes(plugin.meta.id))
          .map((plugin): [PluginMeta, SettingsStore<SettingsValue>] | null => {
            const settings = settingsStore?.getStore(plugin.meta.id);
            if (!settings) {
              return null;
            }

            return [plugin.meta, settings];
          })
          .filter(nonNullable)
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
