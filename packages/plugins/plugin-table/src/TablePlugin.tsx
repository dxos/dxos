//
// Copyright 2023 DXOS.org
//

import { Table } from '@phosphor-icons/react';
import React from 'react';

import { resolvePlugin, type PluginDefinition, parseIntentPlugin, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { getSpace } from '@dxos/react-client/echo';
import { translations as dataTranslations, ViewEditor } from '@dxos/react-ui-data';
import { type FieldType } from '@dxos/schema';

import { TableContainer } from './components';
import meta, { TABLE_PLUGIN } from './meta';
import { serializer } from './serializer';
import translations from './translations';
import { TableType } from './types';
import { TableAction, type TablePluginProvides, isTable } from './types';

export const TablePlugin = (): PluginDefinition<TablePluginProvides> => {
  return {
    meta,
    ready: async (plugins) => {
      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      clientPlugin?.provides.client.addTypes([TableType]);
    },
    provides: {
      metadata: {
        records: {
          [TableType.typename]: {
            label: (object: any) => (object instanceof TableType ? object.name : undefined),
            placeholder: ['object placeholder', { ns: TABLE_PLUGIN }],
            icon: 'ph--table--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (table: TableType) => [], // loadObjectReferences(table, (table) => [table.schema]),
            serializer,
          },
        },
      },
      translations: [...translations, ...dataTranslations],
      echo: {
        schema: [TableType],
      },
      space: {
        onSpaceCreate: {
          label: ['create object label', { ns: TABLE_PLUGIN }],
          action: TableAction.CREATE,
        },
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: TableAction.CREATE,
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
                  id: `${TABLE_PLUGIN}/create/${node.id}`,
                  data: async () => {
                    await dispatch([
                      { plugin: TABLE_PLUGIN, action: TableAction.CREATE },
                      { action: SpaceAction.ADD_OBJECT, data: { target } },
                      { action: NavigationAction.OPEN },
                    ]);
                  },
                  properties: {
                    label: ['create object label', { ns: TABLE_PLUGIN }],
                    icon: 'ph--table--regular',
                    testId: 'tablePlugin.createObject',
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
            case 'slide':
              return isTable(data.slide) ? <TableContainer table={data.slide} /> : null;
            case 'section':
            case 'article':
              return isTable(data.object) ? <TableContainer role={role} table={data.object} /> : null;
            case 'complementary--settings': {
              if (data.subject instanceof TableType) {
                const table = data.subject;
                if (!table.view) {
                  return null;
                }

                const space = getSpace(table);
                const schema = space?.db.schemaRegistry.getSchema(table.view.query.__typename);
                if (!schema) {
                  return null;
                }

                return {
                  node: <ViewEditor schema={schema} view={table.view} />,
                };
              }

              return null;
            }
            default:
              return null;
          }
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-table',
            testId: 'tablePlugin.createSection',
            type: ['plugin name', { ns: TABLE_PLUGIN }],
            label: ['create stack section label', { ns: TABLE_PLUGIN }],
            icon: (props: any) => <Table {...props} />,
            intent: {
              plugin: TABLE_PLUGIN,
              action: TableAction.CREATE,
            },
          },
        ],
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TableAction.CREATE: {
              return {
                data: create(TableType, { name: '', threads: [] }),
              };
            }

            case TableAction.ADD_COLUMN: {
              const { table, field: _field } = intent.data as TableAction.AddColumn;
              if (!isTable(table) || !table.view) {
                return;
              }

              // TODO(ZaymonFC): We need to manipulate the schema with another method here.
              // addFieldToView(table.schema, table.view, field);
              return { data: true };
            }

            case TableAction.DELETE_COLUMN: {
              const { table, field } = intent.data as TableAction.DeleteColumn;
              if (!isTable(table) || !table.view) {
                return;
              }

              if (!intent.undo) {
                const fieldPosition = table.view.fields.indexOf(field);
                if (fieldPosition === undefined) {
                  return;
                }

                // TODO(ZaymonFC): We need to manipulate the schema with another method here.
                // removeFieldFromView(table.schema, table.view, field);

                return {
                  undoable: {
                    message: translations[0]['en-US'][TABLE_PLUGIN]['column deleted label'],
                    data: { view: table.view, field, fieldPosition },
                  },
                };
              } else if (intent.undo) {
                const { field: _field, fieldPosition: _fieldPosition } = intent.data as {
                  field: FieldType;
                  fieldPosition: number;
                };

                // TODO(burdon): Update projection.
                return { data: true };
              }
            }
          }
        },
      },
    },
  };
};
