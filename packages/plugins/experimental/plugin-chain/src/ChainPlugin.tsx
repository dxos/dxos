//
// Copyright 2023 DXOS.org
//

import { HeadCircuit } from '@phosphor-icons/react';
import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { loadObjectReferences } from '@dxos/react-client/echo';

import { ChainArticle } from './components';
import meta, { CHAIN_PLUGIN } from './meta';
import translations from './translations';
import { ChainPromptType, ChainType } from './types';
import { ChainAction, type ChainPluginProvides } from './types';

export const ChainPlugin = (): PluginDefinition<ChainPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ChainType.typename]: {
            placeholder: ['object placeholder', { ns: CHAIN_PLUGIN }],
            icon: 'ph--head-circuit--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (chain: ChainType) => loadObjectReferences(chain, (chain) => chain.prompts),
          },
        },
      },
      translations,
      echo: {
        schema: [ChainType, ChainPromptType],
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-chain',
            testId: 'chainPlugin.createSection',
            type: ['plugin name', { ns: CHAIN_PLUGIN }],
            label: ['create stack section label', { ns: CHAIN_PLUGIN }],
            icon: (props: any) => <HeadCircuit {...props} />,
            intent: {
              plugin: CHAIN_PLUGIN,
              action: ChainAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'article':
              return data.object instanceof ChainType ? <ChainArticle chain={data.object} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ChainAction.CREATE: {
              return {
                data: create(ChainType, { prompts: [] }),
              };
            }
          }
        },
      },
    },
  };
};
