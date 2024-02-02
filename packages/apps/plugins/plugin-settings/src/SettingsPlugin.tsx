//
// Copyright 2023 DXOS.org
//

import { Gear } from '@phosphor-icons/react';
import React from 'react';

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

import { SettingsDialogContent } from './components';
import meta, { SETTINGS_PLUGIN } from './meta';
import translations from './translations';

export type SettingsPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides;

/**
 * Plugin for aggregating and rendering plugin settings.
 */
export const SettingsPlugin = (): PluginDefinition<SettingsPluginProvides> => {
  return {
    meta,
    provides: {
      surface: {
        component: ({ data }) => {
          switch (data.component) {
            case `${SETTINGS_PLUGIN}/Settings`:
              return <SettingsDialogContent />;

            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SettingsAction.OPEN: {
              return {
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: `${SETTINGS_PLUGIN}/Settings`,
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
        builder: ({ parent, plugins }) => {
          if (parent.id !== 'root') {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          parent.addAction({
            id: SettingsAction.OPEN,
            label: ['open settings label', { ns: SETTINGS_PLUGIN }],
            icon: (props) => <Gear {...props} />,
            keyBinding: 'meta+,',
            invoke: () =>
              intentPlugin?.provides.intent.dispatch({
                plugin: SETTINGS_PLUGIN,
                action: SettingsAction.OPEN,
              }),
          });
        },
      },
      translations,
    },
  };
};
