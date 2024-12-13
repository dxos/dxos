//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  createSurface,
  NavigationAction,
  parseIntentPlugin,
  type PluginDefinition,
  resolvePlugin,
} from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';

import ChessContainer from './components/ChessContainer';
import meta, { CHESS_PLUGIN } from './meta';
import translations from './translations';
import { ChessAction, type ChessPluginProvides, GameType, isObject } from './types';

export const ChessPlugin = (): PluginDefinition<ChessPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [GameType.typename]: {
            createObject: ChessAction.CREATE,
            placeholder: ['game title placeholder', { ns: CHESS_PLUGIN }],
            icon: 'ph--shield-chevron--regular',
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
                    icon: 'ph--shield-chevron--regular',
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
        definitions: () =>
          createSurface({
            id: CHESS_PLUGIN,
            role: ['article', 'section'],
            filter: (data): data is { subject: GameType } => isObject(data.subject),
            component: ({ data, role }) => <ChessContainer game={data.subject} role={role} />,
          }),
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
