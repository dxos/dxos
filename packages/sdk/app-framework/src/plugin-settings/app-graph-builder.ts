//
// Copyright 2025 DXOS.org
//

import { GraphBuilder, NodeMatcher } from '@dxos/app-graph';
import { type SettingsStore, type SettingsValue } from '@dxos/local-storage';
import { isNonNullable } from '@dxos/util';

import * as Common from '../common';
import { Capability, type Plugin } from '../core';
import { createIntent } from '../plugin-intent';

import { SETTINGS_ID, SETTINGS_KEY, SettingsAction } from './actions';
import { meta } from './meta';

export default Capability.makeModule((context) =>
  Capability.contributes(Common.Capability.AppGraphBuilder, [
    GraphBuilder.createExtension({
      id: `${meta.id}/action`,
      match: NodeMatcher.whenRoot,
      actions: () => [
        {
          id: meta.id,
          data: async () => {
            const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
            await dispatch(createIntent(SettingsAction.Open));
          },
          properties: {
            label: ['open settings label', { ns: meta.id }],
            icon: 'ph--gear--regular',
            disposition: 'menu',
            keyBinding: {
              macos: 'meta+,',
              windows: 'alt+,',
            },
          },
        },
      ],
    }),
    GraphBuilder.createExtension({
      id: `${meta.id}/core`,
      match: NodeMatcher.whenRoot,
      connector: () => [
        {
          id: SETTINGS_ID,
          type: meta.id,
          properties: {
            label: ['app settings label', { ns: meta.id }],
            icon: 'ph--gear--regular',
            disposition: 'pin-end',
            position: 'hoist',
            testId: 'treeView.appSettings',
          },
        },
      ],
    }),
    GraphBuilder.createExtension({
      id: `${meta.id}/core-plugins`,
      match: NodeMatcher.whenId(SETTINGS_ID),
      connector: (node, get) => {
        const manager = get(context.capability(Common.Capability.PluginManager));
        const [settingsStore] = get(context.capabilities(Common.Capability.SettingsStore));
        return [
          ...manager.plugins
            .filter((plugin: Plugin.Plugin) => manager.core.includes(plugin.meta.id))
            .map((plugin: Plugin.Plugin): [Plugin.Meta, SettingsStore<SettingsValue>] | null => {
              const settings = settingsStore?.getStore(plugin.meta.id);
              if (!settings) {
                return null;
              }

              return [plugin.meta, settings];
            })
            .filter(isNonNullable)
            .map(([meta, settings]: [Plugin.Meta, SettingsStore<SettingsValue>]) => ({
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
              label: ['custom plugins label', { ns: meta.id }],
              icon: 'ph--squares-four--regular',
              role: 'branch',
              disposition: 'collection',
            },
          },
        ];
      },
    }),
    GraphBuilder.createExtension({
      id: `${meta.id}/custom-plugins`,
      match: NodeMatcher.whenId(`${SETTINGS_KEY}:custom-plugins`),
      connector: (node, get) => {
        const manager = get(context.capability(Common.Capability.PluginManager));
        const [settingsStore] = get(context.capabilities(Common.Capability.SettingsStore));
        return manager.plugins
          .filter((plugin: Plugin.Plugin) => !manager.core.includes(plugin.meta.id))
          .map((plugin: Plugin.Plugin): [Plugin.Meta, SettingsStore<SettingsValue>] | null => {
            const settings = settingsStore?.getStore(plugin.meta.id);
            if (!settings) {
              return null;
            }

            return [plugin.meta, settings];
          })
          .filter(isNonNullable)
          .map(([meta, settings]: [Plugin.Meta, SettingsStore<SettingsValue>]) => ({
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
  ]),
);
