//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Game } from '@dxos/chess-app';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { ChessMain } from './components';
import translations from './translations';
import { isObject, CHESS_PLUGIN, ChessAction, ChessPluginProvides } from './types';
import { objectToGraphNode } from './util';

export const ChessPlugin = (): PluginDefinition<ChessPluginProvides> => {
  const adapter = new GraphNodeAdapter({ filter: Game.filter(), adapter: objectToGraphNode });

  return {
    meta: {
      id: CHESS_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      graph: {
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          parent.addAction({
            id: `${CHESS_PLUGIN}/create`,
            label: ['create game label', { ns: CHESS_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            intent: [
              {
                plugin: CHESS_PLUGIN,
                action: ChessAction.CREATE,
              },
              {
                action: SpaceAction.ADD_OBJECT,
                data: { spaceKey: parent.data.key.toHex() },
              },
              {
                action: TreeViewAction.ACTIVATE,
              },
            ],
            properties: {
              testId: 'chessPlugin.createKanban',
            },
          });

          return adapter.createNodes(space, parent);
        },
      },
      translations,
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        switch (role) {
          case 'main': {
            if (isObject(data)) {
              return ChessMain;
            }
          }
        }

        return null;
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ChessAction.CREATE: {
              return { object: new Game() };
            }
          }
        },
      },
    },
  };
};
