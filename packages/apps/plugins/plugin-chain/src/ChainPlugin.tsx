//
// Copyright 2023 DXOS.org
//

import { Brain, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Chain as ChainType, Folder } from '@braneframe/types';
import { resolvePlugin, parseIntentPlugin, LayoutAction, type PluginDefinition } from '@dxos/app-framework';
import { SpaceProxy, TextObject } from '@dxos/react-client/echo';

import { ChainMain } from './components';
import meta, { CHAIN_PLUGIN } from './meta';
import translations from './translations';
import { ChainAction, type ChainPluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[ChainType.name] = ChainType;

export const ChainPlugin = (): PluginDefinition<ChainPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ChainType.schema.typename]: {
            placeholder: ['object placeholder', { ns: CHAIN_PLUGIN }],
            icon: (props: IconProps) => <Brain {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          if (parent.data instanceof Folder || parent.data instanceof SpaceProxy) {
            parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
              id: `${CHAIN_PLUGIN}/create`,
              label: ['create object label', { ns: CHAIN_PLUGIN }],
              icon: (props) => <Brain {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: CHAIN_PLUGIN,
                    action: ChainAction.CREATE,
                  },
                  {
                    action: SpaceAction.ADD_OBJECT,
                    data: { target: parent.data },
                  },
                  {
                    action: LayoutAction.ACTIVATE,
                  },
                ]),
              properties: {
                testId: 'chainPlugin.createObject',
              },
            });
          }
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-chain',
            testId: 'chainPlugin.createSectionSpaceChain',
            label: ['create stack section label', { ns: CHAIN_PLUGIN }],
            icon: (props: any) => <Brain {...props} />,
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
            case 'main':
              return isObject(data.active) ? <ChainMain chain={data.active as ChainType} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ChainAction.CREATE: {
              return {
                object: new ChainType({ prompts: [{ source: new TextObject(example) }] }),
              };
            }
          }
        },
      },
    },
  };
};

const example = [
  '# Sample',
  'Objective',
  '',
  "Your objective is to create a sequential workflow based on the user's query.",
  '',
  'Use the following context:',
  '',
  '{context}',
].join('\n');
