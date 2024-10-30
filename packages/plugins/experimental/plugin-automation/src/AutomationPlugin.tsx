//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions/types';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { ChainArticle } from './components';
import meta, { AUTOMATION_PLUGIN } from './meta';
import translations from './translations';
import { ChainPromptType, ChainType, AutomationAction, type AutomationPluginProvides } from './types';

export const AutomationPlugin = (): PluginDefinition<AutomationPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ChainType.typename]: {
            placeholder: ['object placeholder', { ns: AUTOMATION_PLUGIN }],
            icon: 'ph--magic-wand--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (chain: ChainType) => loadObjectReferences(chain, (chain) => chain.prompts),
          },
        },
      },
      translations,
      echo: {
        schema: [ChainType, ChainPromptType, FunctionDef, FunctionTrigger],
      },
      graph: {
        builder: (plugins) => {
          return [];
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'article':
              return data.object instanceof ChainType ? <ChainArticle chain={data.object} /> : null;
            case 'complementary--automation':
              return <div>Automation</div>;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case AutomationAction.CREATE: {
              return {
                data: create(ChainType, { prompts: [] }),
                // data: create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '' } }),
              };
            }
          }
        },
      },
    },
  };
};
