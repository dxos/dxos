//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';

import { createExtension, type Node } from '@dxos/app-graph';
import { type SettingsStore, type SettingsValue } from '@dxos/local-storage';
import { isNonNullable } from '@dxos/util';

import { SETTINGS_ID, SETTINGS_KEY, SETTINGS_PLUGIN, SettingsAction } from './actions';
import { Capabilities } from '../common';
import { contributes, type PluginMeta, type PluginContext } from '../core';
import { createIntent } from '../plugin-intent';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${SETTINGS_PLUGIN}/action`,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () =>
        Rx.make([
          {
            id: SETTINGS_PLUGIN,
            data: async () => {
              const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
              await dispatch(createIntent(SettingsAction.Open));
            },
            properties: {
              label: ['open settings label', { ns: SETTINGS_PLUGIN }],
              icon: 'ph--gear--regular',
              disposition: 'menu',
              keyBinding: {
                macos: 'meta+,',
                windows: 'alt+,',
              },
            },
          },
        ]),
    }),
    createExtension({
      id: `${SETTINGS_PLUGIN}/core`,
      filter: (node): node is Node<null> => node.id === 'root',
      connector: () =>
        Rx.make([
          {
            id: SETTINGS_ID,
            type: SETTINGS_PLUGIN,
            properties: {
              label: ['app settings label', { ns: SETTINGS_PLUGIN }],
              icon: 'ph--gear--regular',
              disposition: 'pin-end',
              position: 'hoist',
              testId: 'treeView.appSettings',
            },
          },
        ]),
    }),
    createExtension({
      id: `${SETTINGS_PLUGIN}/core-plugins`,
      filter: (node): node is Node<null> => node.id === SETTINGS_ID,
      connector: () => {
        return Rx.make((get) => {
          const manager = get(context.capability(Capabilities.PluginManager));
          const [settingsStore] = get(context.capabilities(Capabilities.SettingsStore));
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
              type: 'category',
              properties: {
                label: ['custom plugins label', { ns: SETTINGS_PLUGIN }],
                icon: 'ph--squares-four--regular',
                role: 'branch',
                disposition: 'collection',
              },
            },
          ];
        });
      },
    }),
    createExtension({
      id: `${SETTINGS_PLUGIN}/custom-plugins`,
      filter: (node): node is Node<null> => node.id === `${SETTINGS_KEY}:custom-plugins`,
      connector: () => {
        return Rx.make((get) => {
          const manager = get(context.capability(Capabilities.PluginManager));
          const [settingsStore] = get(context.capabilities(Capabilities.SettingsStore));
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
        });
      },
    }),
  ]);
