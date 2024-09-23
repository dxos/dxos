//
// Copyright 2023 DXOS.org
//

import { type IconProps, ShieldChevron } from '@phosphor-icons/react';
import React from 'react';

import { type PluginDefinition, resolvePlugin, parseIntentPlugin, NavigationAction } from '@dxos/app-framework';
import { GameType } from '@dxos/chess-app';
import { create } from '@dxos/echo-schema';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';

import ChessContainer from './components/ChessContainer';
import meta, { CHESS_PLUGIN } from './meta';
import translations from './translations';
import { ChessAction, type ChessPluginProvides, isObject } from './types';

export const ChessPlugin = (): PluginDefinition<ChessPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [GameType.typename]: {
            placeholder: ['game title placeholder', { ns: CHESS_PLUGIN }],
            icon: (props: IconProps) => <ShieldChevron {...props} />,
            iconSymbol: 'ph--shield-chevron--regular',
          },
        },
      },
      echo: {
        schema: [GameType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: ChessAction.CREATE,
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
                  id: `${CHESS_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: CHESS_PLUGIN, action: ChessAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create game label', { ns: CHESS_PLUGIN }],
                    icon: (props: IconProps) => <ShieldChevron {...props} />,
                    iconSymbol: 'ph--shield-chevron--regular',
                    testId: 'chessPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      translations,
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'article':
            case 'section':
              return isObject(data.object) ? <ChessContainer game={data.object} role={role} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ChessAction.CREATE: {
              return { data: create(GameType, {}) };
            }
          }
        },
      },
    },
  };
};
