//
// Copyright 2023 DXOS.org
//

import { type IconProps, Table } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { Table as TableType } from '@braneframe/types/proto';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';

import { TableMain, TableSection, TableSlide } from './components';
import meta, { TABLE_PLUGIN } from './meta';
import translations from './translations';
import { TableAction, type TablePluginProvides, isTable } from './types';

export const TablePlugin = (): PluginDefinition<TablePluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [TableType.schema.typename]: {
            placeholder: ['object placeholder', { ns: TABLE_PLUGIN }],
            icon: (props: IconProps) => <Table {...props} />,
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
                  plugin: TABLE_PLUGIN,
                  action: TableAction.CREATE,
                  properties: {
                    label: ['create object label', { ns: TABLE_PLUGIN }],
                    icon: (props: IconProps) => <Table {...props} />,
                    testId: 'tablePlugin.createObject',
                  },
                  dispatch,
                }),
              );

              // Add all tables to the graph.
              const query = space.db.query(TableType.filter());
              let previousObjects: TableType[] = [];
              subscriptions.add(
                effect(() => {
                  const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
                  previousObjects = query.objects;

                  batch(() => {
                    removedObjects.forEach((object) => graph.removeNode(object.id));
                    query.objects.forEach((object) => {
                      graph.addNodes({
                        id: object.id,
                        data: object,
                        properties: {
                          // TODO(wittjosiah): Reconcile with metadata provides.
                          label: object.title || ['object placeholder', { ns: TABLE_PLUGIN }],
                          icon: (props: IconProps) => <Table {...props} />,
                          testId: 'spacePlugin.object',
                          persistenceClass: 'echo',
                          persistenceKey: space?.key.toHex(),
                        },
                      });
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
              return isTable(data.active) ? <TableMain table={data.active} /> : null;
            case 'slide':
              return isTable(data.slide) ? <TableSlide table={data.slide} /> : null;
            case 'section':
              return isTable(data.object) ? <TableSection table={data.object} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TableAction.CREATE: {
              return { data: new TableType() };
            }
          }
        },
      },
    },
  };
};
