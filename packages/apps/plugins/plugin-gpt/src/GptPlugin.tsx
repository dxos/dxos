//
// Copyright 2023 DXOS.org
//

import { Brain } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN } from '@braneframe/plugin-space';
import { Folder } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, type PluginDefinition } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceProxy } from '@dxos/react-client/echo';

import { GptSettings } from './components';
import meta, { GPT_PLUGIN } from './meta';
import translations from './translations';
import { GptAction, type GptPluginProvides, type GptSettingsProps } from './types';

export const GptPlugin = (): PluginDefinition<GptPluginProvides> => {
  const settings = new LocalStorageStore<GptSettingsProps>(GPT_PLUGIN, {});

  return {
    meta,
    ready: async () => {
      settings.prop(settings.values.$apiKey!, 'api-key', LocalStorageStore.string);
    },
    provides: {
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${GPT_PLUGIN}/analyze`,
            label: ['analyze document label', { ns: GPT_PLUGIN }],
            icon: (props) => <Brain {...props} />,
            invoke: () => intentPlugin?.provides.intent.dispatch([]),
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <GptSettings settings={settings.values} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case GptAction.ANALYZE: {
              console.log('analyze...');
            }
          }
        },
      },
    },
  };
};
