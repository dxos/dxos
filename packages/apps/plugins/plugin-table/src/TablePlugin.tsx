//
// Copyright 2023 DXOS.org
//

import { type IconProps, Table } from '@phosphor-icons/react';
import { batch, effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { parseSpacePlugin, updateGraphWithAddObjectAction } from '@braneframe/plugin-space';
import { TableType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin } from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { Filter } from '@dxos/react-client/echo';

import { TableMain, TableSection, TableSlide } from './components';
import meta, { TABLE_PLUGIN } from './meta';
import translations from './translations';
import { TableAction, type TablePluginProvides, isTable } from './types';

export const TablePlugin = (): PluginDefinition<TablePluginProvides> => {
  return {
    meta,
    ready: async (plugins) => {
      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      clientPlugin?.provides.client.addSchema(TableType);
    },
    provides: {
      metadata: {
        records: {
          [TableType.typename]: {
            label: (object: any) => (object instanceof TableType ? object.title : undefined),
            placeholder: ['object placeholder', { ns: TABLE_PLUGIN }],
            icon: (props: IconProps) => <Table {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: (plugins, graph) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const enabled = resolvePlugin(plugins, parseSpacePlugin)?.provides.space.enabled;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch || !enabled) {
            return;
          }

          const subscriptions = new EventSubscriptions();
          const unsubscribe = effect(() => {
            subscriptions.clear();
            client.spaces.get().forEach((space) => {
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
            });

            client.spaces
              .get()
              .filter((space) => !!enabled.find((key) => key.equals(space.key)))
              .forEach((space) => {
                // Add all tables to the graph.
                const query = space.db.query(Filter.schema(TableType));
                subscriptions.add(query.subscribe());
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
      stack: {
        creators: [
          {
            id: 'create-stack-section-table',
            testId: 'tablePlugin.createSectionSpaceSketch',
            label: ['create stack section label', { ns: TABLE_PLUGIN }],
            icon: (props: any) => <Table {...props} />,
            intent: [{ plugin: TABLE_PLUGIN, action: TableAction.CREATE }],
          },
        ],
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TableAction.CREATE: {
              return {
                data: create(TableType, { title: '', props: [] }),
              };
            }
          }
        },
      },
    },
  };
};
