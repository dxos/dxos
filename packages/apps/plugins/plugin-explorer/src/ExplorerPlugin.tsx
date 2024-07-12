//
// Copyright 2023 DXOS.org
//

import { Graph, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { ViewType } from '@braneframe/types';
import { NavigationAction, parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { create } from '@dxos/react-client/echo';

import { ExplorerArticle, ExplorerMain } from './components';
import meta, { EXPLORER_PLUGIN } from './meta';
import translations from './translations';
import { ExplorerAction, type ExplorerPluginProvides } from './types';

export const ExplorerPlugin = (): PluginDefinition<ExplorerPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [ViewType.typename]: {
            placeholder: ['object title placeholder', { ns: EXPLORER_PLUGIN }],
            icon: (props: IconProps) => <Graph {...props} />,
          },
        },
      },
      translations,
      echo: {
        schema: [ViewType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: ExplorerAction.CREATE,
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
                  id: `${EXPLORER_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: EXPLORER_PLUGIN, action: ExplorerAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create object label', { ns: EXPLORER_PLUGIN }],
                    icon: (props: IconProps) => <Graph {...props} />,
                    testId: 'explorerPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return data.active instanceof ViewType ? <ExplorerMain view={data.active} /> : null;
            case 'article':
              return data.object instanceof ViewType ? <ExplorerArticle view={data.object} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ExplorerAction.CREATE: {
              return { data: create(ViewType, { name: '', type: '' }) };
            }
          }
        },
      },
    },
  };
};
