//
// Copyright 2023 DXOS.org
//

import { type IconProps, Plus, ShieldChevron } from '@phosphor-icons/react';
import React from 'react';

import { SpaceAction } from '@braneframe/plugin-space';
import { Folder } from '@braneframe/types';
import { type PluginDefinition, resolvePlugin, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { Game } from '@dxos/chess-app';

import { ChessMain } from './components';
import translations from './translations';
import { CHESS_PLUGIN, ChessAction, type ChessPluginProvides, isObject } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[Game.name] = Game;
export const ChessPlugin = (): PluginDefinition<ChessPluginProvides> => {
  return {
    meta: {
      id: CHESS_PLUGIN,
    },
    provides: {
      metadata: {
        records: {
          [Game.schema.typename]: {
            fallbackName: ['game title placeholder', { ns: CHESS_PLUGIN }],
            icon: (props: IconProps) => <ShieldChevron {...props} />,
          },
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.addAction({
            id: `${CHESS_PLUGIN}/create`,
            label: ['create game label', { ns: CHESS_PLUGIN }],
            icon: (props) => <Plus {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: CHESS_PLUGIN,
                  action: ChessAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_TO_FOLDER,
                  data: { folder: parent.data },
                },
                {
                  action: LayoutAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'chessPlugin.createObject',
            },
          });
        },
      },
      translations,
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isObject(data.active) ? <ChessMain game={data.active} /> : null;
            default:
              return null;
          }
        },
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
