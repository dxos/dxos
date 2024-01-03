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
        resolver: (intent, plugins) => {
          switch (intent.action) {
            case SettingsAction.OPEN: {
              // TODO(wittjosiah): This will always be available because we're in an intent resolver.
              //  The resolver should have intent dispatch as an argument.
              const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
              return intentPlugin?.provides.intent.dispatch({
                action: LayoutAction.OPEN_DIALOG,
                data: { component: `${SETTINGS_PLUGIN}/Settings` },
              });
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
