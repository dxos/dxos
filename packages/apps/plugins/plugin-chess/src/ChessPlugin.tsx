//
// Copyright 2023 DXOS.org
//

import { type IconProps, ShieldChevron } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { type PluginDefinition, resolvePlugin, parseIntentPlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { Game } from '@dxos/chess-app';

import { ChessMain } from './components';
import meta, { CHESS_PLUGIN } from './meta';
import translations from './translations';
import { ChessAction, type ChessPluginProvides, isObject } from './types';

export const ChessPlugin = (): PluginDefinition<ChessPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [Game.schema.typename]: {
            placeholder: ['game title placeholder', { ns: CHESS_PLUGIN }],
            icon: (props: IconProps) => <ShieldChevron {...props} />,
          },
        },
      },
      graph: {
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const { unsubscribe } = client.spaces.subscribe((spaces) => {
            spaces.forEach((space) => {
              subscriptions.add(
                updateGraphWithAddObjectAction({
                  graph,
                  space,
                  plugin: CHESS_PLUGIN,
                  action: ChessAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: CHESS_PLUGIN }],
                    icon: (props: IconProps) => <ShieldChevron {...props} />,
                    testId: 'chessPlugin.createObject',
                  },
                  dispatch,
                }),
              );

              // Add all games to the graph.
              const query = space.db.query(Game.filter());
              let previousObjects: Game[] = [];
              subscriptions.add(
                effect(() => {
                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;
                  removedObjects.forEach((object) => graph.removeNode(object.id));
                  query.objects.forEach((object) => {
                    graph.addNodes({
                      id: object.id,
                      data: object,
                      properties: {
                        // TODO(wittjosiah): Reconcile with metadata provides.
                        label: ['object title placeholder', { ns: CHESS_PLUGIN }],
                        icon: (props: IconProps) => <ShieldChevron {...props} />,
                        testId: 'spacePlugin.object',
                        persistenceClass: 'echo',
                        persistenceKey: space?.key.toHex(),
                      },
                    });
                  });
                }),
              );
            });
          });

          return () => {
            unsubscribe();
            subscriptions.clear();
          };
        },
      },
      translations,
      surface: {
        component: ({ data, role }) => {
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
              return { data: new Game() };
            }
          }
        },
      },
    },
  };
};
