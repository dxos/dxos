//
// Copyright 2023 DXOS.org
//

import { type IconProps, SquaresFour } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { Grid as GridType } from '@braneframe/types';
import { parseIntentPlugin, resolvePlugin, type PluginDefinition } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';

import { GridMain } from './components';
import meta, { GRID_PLUGIN } from './meta';
import translations from './translations';
import { GridAction, type GridPluginProvides, isGrid } from './types';

export const GridPlugin = (): PluginDefinition<GridPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [GridType.schema.typename]: {
            placeholder: ['grid title placeholder', { ns: GRID_PLUGIN }],
            icon: (props: IconProps) => <SquaresFour {...props} />,
          },
          [GridType.Item.schema.typename]: {
            parse: (item: GridType.Item, type: string) => {
              switch (type) {
                case 'node':
                  return { id: item.object.id, label: item.object.title, data: item.object };
                case 'object':
                  return item.object;
                case 'view-object':
                  return item;
              }
            },
          },
        },
      },
      translations,
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
                  plugin: GRID_PLUGIN,
                  action: GridAction.CREATE,
                  properties: {
                    label: ['create grid label', { ns: GRID_PLUGIN }],
                    icon: (props: IconProps) => <SquaresFour {...props} />,
                    testId: 'gridPlugin.createObject',
                  },
                  dispatch,
                }),
              );

              // Add all grids to the graph.
              const query = space.db.query(GridType.filter());
              let previousObjects: GridType[] = [];
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
                        label: object.title || ['grid title placeholder', { ns: GRID_PLUGIN }],
                        icon: (props: IconProps) => <SquaresFour {...props} />,
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
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isGrid(data.active) ? <GridMain grid={data.active} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case GridAction.CREATE: {
              return { data: new GridType() };
            }
          }
        },
      },
    },
  };
};
