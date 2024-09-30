//
// Copyright 2023 DXOS.org
//

import { Function, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { NavigationAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions/types';
import { ChainPromptType, ChainType } from '@dxos/plugin-chain';
import { parseClientPlugin } from '@dxos/plugin-client';
import { createExtension, isActionGroup, type ActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';

import { TriggerArticle } from './components';
import meta, { FUNCTION_PLUGIN } from './meta';
import translations from './translations';
import { FunctionAction, type FunctionPluginProvides } from './types';

export const FunctionPlugin = (): PluginDefinition<FunctionPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [FunctionTrigger.typename]: {
            label: (object: any) => (object instanceof FunctionTrigger ? object.name : undefined),
            placeholder: ['object placeholder', { ns: FUNCTION_PLUGIN }],
            icon: (props: IconProps) => <Function {...props} />,
            iconSymbol: 'ph--function--regular',
          },
        },
      },
      translations,
      echo: {
        schema: [FunctionDef, FunctionTrigger, ChainPromptType, ChainType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: FunctionAction.CREATE,
            filter: (node): node is ActionGroup => isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
            actions: ({ node }) => {
              const id = node.id.split('/').at(-1);
              const [spaceId, objectId] = id?.split(':') ?? [];
              const space = client.spaces.get().find((space) => space.id === spaceId);
              const object = objectId && space?.db.getObjectById(objectId);
              const target = objectId ? object : space;
              if (!target) {
                return;
              }

              return [
                {
                  id: `${FUNCTION_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: FUNCTION_PLUGIN, action: FunctionAction.CREATE, data: { space } },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create object label', { ns: FUNCTION_PLUGIN }],
                    icon: (props: IconProps) => <Function {...props} />,
                    iconSymbol: 'ph--function--duotone',
                    testId: 'functionPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-function',
            testId: 'functionPlugin.createSection',
            type: ['plugin name', { ns: FUNCTION_PLUGIN }],
            label: ['create stack section label', { ns: FUNCTION_PLUGIN }],
            icon: (props: any) => <Function {...props} />,
            intent: {
              plugin: FUNCTION_PLUGIN,
              action: FunctionAction.CREATE,
            },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'article':
            case 'section': {
              return data.object instanceof FunctionTrigger ? <TriggerArticle trigger={data.object} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case FunctionAction.CREATE: {
              return {
                // TODO(burdon): Props should be undefined.
                data: create(FunctionTrigger, { function: '', spec: { type: 'timer', cron: '' } }),
              };
            }
          }
        },
      },
    },
  };
};
