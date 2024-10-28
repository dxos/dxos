//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  type IntentResolverProvides,
  type GraphBuilderProvides,
  LayoutAction,
  type PluginDefinition,
  SettingsAction,
  type SurfaceProvides,
  type TranslationsProvides,
  parseIntentPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { SettingsDialog, SettingsSettings } from './components';
import meta, { MANAGER_PLUGIN } from './meta';
import translations from './translations';

export type SettingsPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides;

type SettingsSettingsProps = {
  selected: string;
};

/**
 * Plugin for aggregating and rendering plugin settings.
 */
export const ManagerPlugin = (): PluginDefinition<SettingsPluginProvides> => {
  const settings = new LocalStorageStore<SettingsSettingsProps>(MANAGER_PLUGIN, {
    selected: 'dxos.org/plugin/settings',
  });

  return {
    meta,
    ready: async () => {
      settings.prop({ key: 'selected', type: LocalStorageStore.string() });
    },
    provides: {
      surface: {
        component: ({ data, role }) => {
          if (data.component === `${MANAGER_PLUGIN}/Settings`) {
            return (
              <SettingsDialog
                selected={settings.values.selected}
                onSelected={(selected) => (settings.values.selected = selected)}
              />
            );
          }

          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <SettingsSettings /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SettingsAction.OPEN: {
              if (intent.data?.plugin) {
                settings.values.selected = intent.data?.plugin;
              }

              return {
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: `${MANAGER_PLUGIN}/Settings`,
                        dialogBlockAlign: 'start',
                      },
                    },
                  ],
                ],
              };
            }
          }
        },
      },
      graph: {
        builder: (plugins) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          return createExtension({
            id: MANAGER_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id: MANAGER_PLUGIN,
                data: async () => {
                  await intentPlugin?.provides.intent.dispatch({
                    plugin: MANAGER_PLUGIN,
                    action: SettingsAction.OPEN,
                  });
                },
                properties: {
                  label: ['open settings label', { ns: MANAGER_PLUGIN }],
                  icon: 'ph--gear--regular',
                  keyBinding: {
                    macos: 'meta+,',
                    windows: 'alt+,',
                  },
                },
              },
            ],
          });
        },
      },
      translations,
    },
  };
};
