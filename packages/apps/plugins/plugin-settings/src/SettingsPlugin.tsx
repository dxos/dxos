//
// Copyright 2023 DXOS.org
//

import { Gear, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { createExtension, type Node } from '@braneframe/plugin-graph';
import {
  type IntentResolverProvides,
  type PluginDefinition,
  type SurfaceProvides,
  parseIntentPlugin,
  resolvePlugin,
  LayoutAction,
  SettingsAction,
  type GraphBuilderProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { SettingsDialog } from './components';
import meta, { SETTINGS_PLUGIN } from './meta';
import translations from './translations';

const DEFAULT_PLUGIN = 'dxos.org/plugin/registry';

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
export const SettingsPlugin = (): PluginDefinition<SettingsPluginProvides> => {
  const settings = new LocalStorageStore<SettingsSettingsProps>(SETTINGS_PLUGIN, { selected: DEFAULT_PLUGIN });

  return {
    meta,
    ready: async () => {
      settings.prop({ key: 'selected', type: LocalStorageStore.string() });
    },
    provides: {
      surface: {
        component: ({ data }) => {
          switch (data.component) {
            case `${SETTINGS_PLUGIN}/Settings`:
              return (
                <SettingsDialog
                  selected={settings.values.selected}
                  onSelected={(selected) => (settings.values.selected = selected)}
                />
              );

            default:
              return null;
          }
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
                        component: `${SETTINGS_PLUGIN}/Settings`,
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
            id: SETTINGS_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id: SETTINGS_PLUGIN,
                data: async () => {
                  await intentPlugin?.provides.intent.dispatch({
                    plugin: SETTINGS_PLUGIN,
                    action: SettingsAction.OPEN,
                  });
                },
                properties: {
                  label: ['open settings label', { ns: SETTINGS_PLUGIN }],
                  icon: (props: IconProps) => <Gear {...props} />,
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
