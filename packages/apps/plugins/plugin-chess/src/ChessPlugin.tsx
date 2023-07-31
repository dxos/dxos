//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React from 'react';

import { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { getIndices, GraphNodeAdapter, SpaceAction } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { TreeViewAction } from '@braneframe/plugin-treeview';
import { Game } from '@dxos/chess-app';
import { SpaceProxy } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { ChessMain } from './components';
import translations from './translations';
import { isObject, CHESS_PLUGIN, ChessAction } from './types';
import { objectToGraphNode } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Game.name] = Game;

type ChessPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

export const ChessPlugin = (): PluginDefinition<ChessPluginProvides> => {
  const adapter = new GraphNodeAdapter(Game.filter(), objectToGraphNode);

  return {
    meta: {
      id: CHESS_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return adapter.createNodes(space, parent, emit);
        },
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [
            {
              id: `${CHESS_PLUGIN}/create-object`,
              index: getIndices(1)[0],
              testId: 'chessPlugin.createKanban',
              label: ['create object label', { ns: CHESS_PLUGIN }],
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
            },
          ];
        },
      },
      translations,
      component: (datum, role) => {
        if (!datum || typeof datum !== 'object') {
          return null;
        }

        switch (role) {
          case 'main': {
            if ('object' in datum && isObject(datum.object)) {
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
