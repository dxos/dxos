//
// Copyright 2023 DXOS.org
//

import { Brain } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN } from '@braneframe/plugin-space';
import { Folder } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, type PluginDefinition } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import meta, { GPT_PLUGIN } from './meta';
import translations from './translations';
import { GptAction, type GptPluginProvides } from './types';

export const GptPlugin = (): PluginDefinition<GptPluginProvides> => {
  return {
    meta,
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
