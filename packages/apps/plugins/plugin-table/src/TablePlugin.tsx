//
// Copyright 2023 DXOS.org
//

import { type IconProps, Table } from '@phosphor-icons/react';
import React from 'react';

import { SpaceAction } from '@braneframe/plugin-space';
import { Table as TableType, Folder } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { Schema } from '@dxos/react-client/echo';

import { TableMain, TableSection, TableSlide } from './components';
import translations from './translations';
import { TABLE_PLUGIN, TableAction, type TablePluginProvides, isTable } from './types';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TableType.name] = TableType;

export const TablePlugin = (): PluginDefinition<TablePluginProvides> => {
  return {
    meta: {
      id: TABLE_PLUGIN,
    },
    provides: {
      metadata: {
        records: {
          [TableType.schema.typename]: {
            fallbackName: ['object placeholder', { ns: TABLE_PLUGIN }],
            icon: (props: IconProps) => <Table {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap['create-object-group']?.addAction({
            id: `${TABLE_PLUGIN}/create`,
            label: ['create object label', { ns: TABLE_PLUGIN }],
            icon: (props) => <Table {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: TABLE_PLUGIN,
                  action: TableAction.CREATE,
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
              testId: 'tablePlugin.createObject',
            },
          });
        },
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isTable(data.active) ? <TableMain table={data.active} /> : null;
            case 'section':
              return isTable(data.object) ? <TableSection table={data.object} /> : null;
            case 'slide':
              return isTable(data.slide) ? <TableSlide table={data.slide} /> : null;
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TableAction.CREATE: {
              const schema = new Schema({
                props: [
                  {
                    id: 'title',
                    type: Schema.PropType.STRING,
                  },
                ],
              });

              return { object: new TableType({ schema }) };
            }
          }
        },
      },
    },
  };
};
