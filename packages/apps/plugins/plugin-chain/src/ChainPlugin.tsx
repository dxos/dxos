//
// Copyright 2023 DXOS.org
//

import { Brain, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { ChainPromptType, ChainType } from '@braneframe/types';
import { type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';

import { ChainArticle } from './components';
import meta, { CHAIN_PLUGIN } from './meta';
import translations from './translations';
import { ChainAction, type ChainPluginProvides } from './types';

export const ChainPlugin = (): PluginDefinition<ChainPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ChainType.typename]: {
            placeholder: ['object placeholder', { ns: CHAIN_PLUGIN }],
            icon: (props: IconProps) => <Brain {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [ChainType, ChainPromptType],
      },
      stack: {
        creators: [
          // {
          //   id: 'create-stack-section-chain',
          //   testId: 'chainPlugin.createSectionSpaceChain',
          //   label: ['create stack section label', { ns: CHAIN_PLUGIN }],
          //   icon: (props: any) => <Brain {...props} />,
          //   intent: {
          //     plugin: CHAIN_PLUGIN,
          //     action: ChainAction.CREATE,
          //   },
          // },
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
